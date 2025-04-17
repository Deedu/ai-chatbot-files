import { NextResponse } from "next/server";
import { generateUUID } from "@/lib/utils";
import { verifyAuth } from "@/utils/verify-auth";
import { createRunPod, formatRunPodResponse } from "@/lib/ai/runpod";
import { generateText } from "ai";

export async function POST(request: Request) {
  const requestStart = new Date();
  const requestId = generateUUID();
  console.log(
    `[${requestId}] Gemma direct request started at ${requestStart.toISOString()}`
  );

  try {
    const user = await verifyAuth();

    if (!user) {
      console.error(`[${requestId}] Authentication failed: No user found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    const {
      systemPrompt,
      userPrompt,
      endpointId = process.env.RUNPOD_ENDPOINT_ID,
      maxTokens = 2000,
      temperature = 0.7,
      topP = 0.9,
    } = await request.json();

    console.log(
      `[${requestId}] Request parameters: temperature=${temperature}, topP=${topP}, maxTokens=${maxTokens}`
    );

    if (!systemPrompt || !userPrompt) {
      console.error(
        `[${requestId}] Error: Missing required parameters - systemPrompt: ${!!systemPrompt}, userPrompt: ${!!userPrompt}`
      );
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get RunPod API key from environment variables
    const apiKey = process.env.RUNPOD_API_KEY;

    if (!apiKey) {
      console.error(
        `[${requestId}] Error: RunPod API key not configured in environment variables`
      );
      return NextResponse.json(
        { error: "RunPod API key not configured" },
        { status: 500 }
      );
    }

    if (!endpointId) {
      console.error(
        `[${requestId}] Error: Gemma endpoint ID not provided or configured`
      );
      return NextResponse.json(
        { error: "Gemma endpoint ID not configured" },
        { status: 500 }
      );
    }

    console.log(
      `[${requestId}] Creating Gemma provider with endpoint: ${endpointId}`
    );

    // Create a custom RunPod provider instance for this request
    const gemmaProvider = createRunPod({
      apiKey,
      endpointId,
    });

    console.log(`[${requestId}] Sending request to Gemma 7B model`);
    const apiCallStart = new Date();

    try {
      // Add request ID to the prompts for tracing in logs
      const augmentedSystemPrompt = `[RequestID: ${requestId}] ${systemPrompt}`;

      // Use the generateText from AI SDK with Gemma model
      const result = await generateText({
        model: gemmaProvider("gemma-7b"),
        messages: [
          { role: "system", content: augmentedSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        maxTokens,
        temperature,
        topP,
      });

      const apiCallEnd = new Date();
      const duration = (apiCallEnd.getTime() - apiCallStart.getTime()) / 1000;
      console.log(`[${requestId}] Gemma API call completed in ${duration}s`);

      // Format the response
      const formattedText = formatRunPodResponse(result.text);

      // Log token usage if available
      if (result.usage) {
        console.log(
          `[${requestId}] Token usage - Prompt: ${result.usage.promptTokens}, Completion: ${result.usage.completionTokens}, Total: ${result.usage.totalTokens}`
        );
      }

      const requestEnd = new Date();
      const totalDuration =
        (requestEnd.getTime() - requestStart.getTime()) / 1000;
      console.log(
        `[${requestId}] Request completed successfully in ${totalDuration}s`
      );

      return NextResponse.json({
        result: formattedText,
        model: "gemma-7b",
        usage: result.usage,
      });
    } catch (apiError) {
      console.error(`[${requestId}] Gemma API error:`, apiError);

      if (apiError instanceof Error) {
        return NextResponse.json(
          {
            error: "Gemma API error",
            message: apiError.message,
            stack: apiError.stack,
          },
          { status: 500 }
        );
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    const requestEnd = new Date();
    const duration = (requestEnd.getTime() - requestStart.getTime()) / 1000;
    console.error(
      `[${requestId}] Request failed at ${requestEnd.toISOString()}, duration: ${duration}s`
    );

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(
        `[${requestId}] Error details: ${error.name}: ${error.message}`
      );
      console.error(`[${requestId}] Stack trace: ${error.stack}`);
    }

    console.error(`[${requestId}] Failed to get response from Gemma:`, error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
      },
      {
        status: 500,
      }
    );
  }
}
