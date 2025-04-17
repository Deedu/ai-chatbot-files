export const DEFAULT_CHAT_MODEL: string = "chat-model";

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model",
    name: "Chat model",
    description: "Primary model for all-purpose chat",
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning model",
    description: "Uses advanced reasoning",
  },
  {
    id: "openai-chat",
    name: "OpenAI GPT-4o",
    description: "OpenAI GPT-4o for general chat",
  },
  {
    id: "openai-reasoning",
    name: "OpenAI Reasoning",
    description: "OpenAI with advanced reasoning capabilities",
  },
  // // RunPod models
  // {
  //   id: "runpod-chat",
  //   name: "RunPod Gemma 3-4B",
  //   description: "Gemma 3-4B model hosted on RunPod",
  // },
  // {
  //   id: "gemma-7b",
  //   name: "RunPod Gemma 7B",
  //   description: "RunPod-hosted Gemma 7B model",
  // },
];
