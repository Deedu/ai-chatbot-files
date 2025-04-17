import { NextResponse } from "next/server";
import { getOpenAIResponse, formatResponse } from "@/lib/ai/openai";
import { verifyAuth } from "@/utils/verify-auth";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const requestStart = new Date();
  const requestId = generateUUID();
  console.log(
    `[${requestId}] OpenAI direct request started at ${requestStart.toISOString()}`
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
      model = "gpt-4o",
      maxTokens = 2000,
      temperature = 0.7,
      topP = 0.9,
    } = await request.json();

    console.log(
      `[${requestId}] Request parameters: model=${model}, temperature=${temperature}, topP=${topP}, maxTokens=${maxTokens}`
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

    // Get OpenAI API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        `[${requestId}] Error: OpenAI API key not configured in environment variables`
      );
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const config = {
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
      topP,
      requestId,
    };

    console.log(
      `[${requestId}] Sending request to OpenAI with model: ${model}`
    );
    const apiCallStart = new Date();
    const output = await getOpenAIResponse(config);
    const apiCallEnd = new Date();
    const duration = (apiCallEnd.getTime() - apiCallStart.getTime()) / 1000;
    console.log(`[${requestId}] OpenAI API call completed in ${duration}s`);

    const formattedOutput = formatResponse(output);

    const requestEnd = new Date();
    const totalDuration =
      (requestEnd.getTime() - requestStart.getTime()) / 1000;
    console.log(
      `[${requestId}] Request completed successfully in ${totalDuration}s`
    );

    return NextResponse.json({
      result: formattedOutput,
    });
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

    console.error(`[${requestId}] Failed to get response from OpenAI:`, error);
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
