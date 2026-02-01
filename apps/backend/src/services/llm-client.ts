import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "../lib/env";

export type LlmClient = typeof openai;

export const createLlmClient = (): LlmClient => {
  if (env.LLM_BASE_URL) {
    return createOpenAI({
      apiKey: env.LLM_API_KEY,
      baseURL: env.LLM_BASE_URL,
    });
  }

  return openai;
};
