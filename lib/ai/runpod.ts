import OpenAI from "openai";

/**
 * Create a RunPod provider for Gemma models
 */
export function createRunPod(
  options: {
    apiKey?: string;
    endpointId?: string;
  } = {}
) {
  const apiKey = options.apiKey || process.env.RUNPOD_API_KEY || "";
  const endpointId = options.endpointId || process.env.RUNPOD_ENDPOINT_ID || "";

  return new OpenAI({
    apiKey,
    baseURL: `https://api.runpod.ai/v2/${endpointId}/openai/v1`,
  });
}

/**
 * Default RunPod instance with environment variables
 */
export const runpod = createRunPod();

/**
 * Format response text by replacing escaped newlines with actual line breaks
 */
export function formatRunPodResponse(text: string): string {
  return text.replace(/\\n/g, "\n");
}
