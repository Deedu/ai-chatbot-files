import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  getChatById,
  saveChat,
  saveMessages,
  ensureUserExists,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { isProductionEnvironment } from "@/lib/constants";
import { openAIProvider } from "@/lib/ai/providers";
import { verifyAuth } from "@/utils/verify-auth";

export const maxDuration = 60;

export async function POST(request: Request) {
  const requestStart = new Date();
  const requestId = generateUUID();
  console.log(
    `[${requestId}] OpenAI chat request started at ${requestStart.toISOString()}`
  );

  try {
    const {
      id,
      messages,
      selectedChatModel,
      temperature = 0.7,
      maxTokens = 2000,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      temperature?: number;
      maxTokens?: number;
    } = await request.json();

    console.log(
      `[${requestId}] Using model: ${selectedChatModel}, temperature: ${temperature}, maxTokens: ${maxTokens}`
    );
    console.log(
      `[${requestId}] Chat ID: ${id}, Message count: ${messages.length}`
    );

    const user = await verifyAuth();
    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Ensure user exists in the database - synchronize Supabase with Prisma
    await ensureUserExists(user.id, user.email as string);

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      console.error(`[${requestId}] Error: No user message found in request`);
      return new Response("No user message found", { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      console.log(`[${requestId}] Creating new chat with ID: ${id}`);
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: user.id, title });
    } else {
      if (chat.userId !== user.id) {
        console.error(
          `[${requestId}] Error: User ${user.id} tried to access chat ${id} owned by ${chat.userId}`
        );
        return new Response("Unauthorized", { status: 401 });
      }
      console.log(`[${requestId}] Using existing chat: ${chat.title}`);
    }

    console.log(`[${requestId}] Saving user message: ${userMessage.id}`);
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: "user",
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    console.log(`[${requestId}] Starting OpenAI response stream`);
    return createDataStreamResponse({
      execute: (dataStream) => {
        const streamStart = new Date();
        console.log(
          `[${requestId}] Stream started at ${streamStart.toISOString()}`
        );

        const result = streamText({
          model: openAIProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === "openai-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({
              session: {
                user,
                expires: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // Expires in 30 days
              },
              dataStream,
            }),
            updateDocument: updateDocument({
              session: {
                user,
                expires: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // Expires in 30 days
              },
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              session: {
                user,
                expires: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // Expires in 30 days
              },
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            const streamEnd = new Date();
            const duration =
              (streamEnd.getTime() - streamStart.getTime()) / 1000;
            console.log(
              `[${requestId}] Stream completed at ${streamEnd.toISOString()}, duration: ${duration}s`
            );

            if (user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === "assistant"
                  ),
                });

                if (!assistantId) {
                  console.error(
                    `[${requestId}] Error: No assistant message found in response`
                  );
                  throw new Error("No assistant message found!");
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                console.log(
                  `[${requestId}] Saving assistant message: ${assistantId}`
                );
                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
                console.log(
                  `[${requestId}] Assistant message saved successfully`
                );
              } catch (error) {
                console.error(`[${requestId}] Failed to save chat:`, error);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error(`[${requestId}] Error in OpenAI stream:`, error);
        return "Oops, an error occurred with OpenAI processing!";
      },
    });
  } catch (error) {
    const requestEnd = new Date();
    const duration = (requestEnd.getTime() - requestStart.getTime()) / 1000;
    console.error(
      `[${requestId}] Request failed at ${requestEnd.toISOString()}, duration: ${duration}s`,
      error
    );

    if (error instanceof Response) {
      return error;
    }

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(
        `[${requestId}] Error details: ${error.name}: ${error.message}`
      );
      console.error(`[${requestId}] Stack trace: ${error.stack}`);
    }

    return new Response(
      "An error occurred while processing your OpenAI request!",
      {
        status: 404,
      }
    );
  }
}
