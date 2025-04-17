import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  deleteChatById,
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
import { myProvider } from "@/lib/ai/providers";
import { verifyAuth } from "@/utils/verify-auth";
import { runpod } from "@/lib/ai/runpod";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    console.log("messages", messages);
    const user = await verifyAuth();
    // console.log("user", user);

    // Ensure user exists in the database - synchronize Supabase with Prisma
    await ensureUserExists(user.id, user.email as string);

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response("No user message found", { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: user.id, title });
    } else {
      if (chat.userId !== user.id) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

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

    console.log("selectedChatModel", selectedChatModel);

    // Use RunPod client if selected
    if (selectedChatModel.startsWith("runpod-")) {
      // Convert UI messages to OpenAI format
      const formattedMessages = messages
        .map((msg) => {
          // Skip data messages as they're not supported by OpenAI format
          if (msg.role === "data") return null;

          // Convert message content to string
          let content = "";
          if (typeof msg.content === "string") {
            content = msg.content;
          } else if (msg.parts && msg.parts.length > 0) {
            // Join parts content if available
            content = msg.parts
              .map((part) =>
                typeof part === "string" ? part : JSON.stringify(part)
              )
              .join("\n");
          }

          return {
            role: msg.role as "user" | "system" | "assistant",
            content,
          };
        })
        .filter(Boolean);

      try {
        const stream = await runpod.chat.completions.create({
          model: "google/gemma-3-4b-it",
          messages: formattedMessages as any, // Type assertion to bypass strict typing
          stream: true,
          max_tokens: 1000,
          temperature: 0.7,
        });

        // Create a TransformStream for processing the response
        const encoder = new TextEncoder();

        const transformStream = new TransformStream({
          async transform(chunk, controller) {
            // Process each chunk and send it to the client
            if (chunk.choices?.[0]?.delta?.content) {
              controller.enqueue(
                encoder.encode(chunk.choices[0].delta.content)
              );
            }
          },
        });

        return new Response(transformStream.readable);
      } catch (error) {
        console.error("RunPod streaming error:", error);
        return new Response("Error processing request", { status: 500 });
      }
    }

    // Otherwise use the default AI SDK implementation
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
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
            if (user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === "assistant"
                  ),
                });

                if (!assistantId) {
                  throw new Error("No assistant message found!");
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

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
              } catch (_) {
                console.error("Failed to save chat");
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
      onError: () => {
        return "Oops, an error occurred!";
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return new Response("An error occurred while processing your request!", {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const user = await verifyAuth();

    const chat = await getChatById({ id });

    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    if (chat.userId !== user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return new Response("An error occurred while processing your request!", {
      status: 500,
    });
  }
}
