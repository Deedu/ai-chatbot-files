import axios, { AxiosError } from "axios";

/**
 * Configuration for the OpenAI API request
 */
interface OpenAIConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  requestId?: string; // Optional request ID for logging
}

/**
 * Sends a request to OpenAI API and returns the response
 * @param config Configuration for the API request
 */
export async function getOpenAIResponse(config: OpenAIConfig) {
  const requestId = config.requestId || "unknown";
  const startTime = new Date();
  console.log(
    `[${requestId}] OpenAI API request to model ${
      config.model
    } initiated at ${startTime.toISOString()}`
  );
  console.log(
    `[${requestId}] OpenAI request settings: temperature=${config.temperature}, topP=${config.topP}, maxTokens=${config.maxTokens}`
  );

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: config.userPrompt },
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    console.log(`[${requestId}] OpenAI API responded in ${duration}s`);

    // Log token usage if available
    if (response.data.usage) {
      console.log(
        `[${requestId}] Token usage - Prompt: ${response.data.usage.prompt_tokens}, Completion: ${response.data.usage.completion_tokens}, Total: ${response.data.usage.total_tokens}`
      );
    }

    // Extract and return the output
    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0
    ) {
      return response.data.choices[0].message.content;
    } else {
      console.error(
        `[${requestId}] Error: OpenAI response missing expected data structure:`,
        response.data
      );
      throw new Error("No output in response");
    }
  } catch (error: unknown) {
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    console.error(
      `[${requestId}] OpenAI API request failed after ${duration}s:`,
      error
    );

    if (axios.isAxiosError(error)) {
      console.error(
        `[${requestId}] OpenAI API error status: ${error.response?.status}`
      );
      console.error(
        `[${requestId}] OpenAI API error data:`,
        error.response?.data
      );

      // Check for common OpenAI error scenarios
      if (error.response?.status === 401) {
        console.error(
          `[${requestId}] Authentication error: Check your OpenAI API key`
        );
      } else if (error.response?.status === 429) {
        console.error(`[${requestId}] Rate limit or quota exceeded`);
      } else if (error.response?.status === 400) {
        console.error(`[${requestId}] Bad request: Check request parameters`);
      }
    }

    if (error instanceof Error) {
      console.error(
        `[${requestId}] Error details: ${error.name}: ${error.message}`
      );
      console.error(`[${requestId}] Stack trace: ${error.stack}`);
    }

    throw error;
  }
}

/**
 * Formats the response text by replacing \n with actual line breaks
 * @param text The text to format
 * @returns Formatted text with proper line breaks
 */
export function formatResponse(text: string): string {
  return text.replace(/\\n/g, "\n");
}
