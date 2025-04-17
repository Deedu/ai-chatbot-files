import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { xai } from "@ai-sdk/xai";
import { openai } from "@ai-sdk/openai";
import { isTestEnvironment } from "../constants";
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from "./models.test";

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        "chat-model": chatModel,
        "chat-model-reasoning": reasoningModel,
        "title-model": titleModel,
        "artifact-model": artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        "chat-model": xai("grok-2-1212"),
        "chat-model-reasoning": wrapLanguageModel({
          model: xai("grok-3-mini-beta"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": xai("grok-2-1212"),
        "artifact-model": xai("grok-2-1212"),
      },
      imageModels: {
        "small-model": xai.image("grok-2-image"),
      },
    });

// OpenAI provider implementation
export const openAIProvider = customProvider({
  languageModels: {
    "openai-chat": openai("gpt-4o"),
    "openai-reasoning": wrapLanguageModel({
      model: openai("gpt-4o"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "openai-title": openai("gpt-3.5-turbo"),
    "openai-artifact": openai("gpt-4o"),
  },
  imageModels: {
    "openai-image": openai.image("dall-e-3"),
  },
});

// Note: RunPod provider is implemented directly in the chat route
// using the standard OpenAI client from the runpod.ts file
