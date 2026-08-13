import type { z } from "zod";

export type LLMProviderKey = "openrouter" | "anthropic" | "openai" | "gemini" | "openai-compatible";

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResult<T> {
  data: T;
  usage: LLMUsage;
}

export interface LLMProvider {
  readonly id: LLMProviderKey;
  generate<T extends z.ZodType>(opts: {
    systemPrompt: string;
    userMessage: string;
    schema: T;
  }): Promise<LLMResult<z.infer<T>>>;
}
