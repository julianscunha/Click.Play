import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { BaseLLM } from "./base.js";

/** LLM provider default/obrigatório do Click.Play (docs/IMPLEMENTATION-PLAN.md §2). */
export class OpenRouterLLM extends BaseLLM {
  readonly id = "openrouter" as const;
  private provider: ReturnType<typeof createOpenRouter>;
  private model: string;

  constructor(model = "anthropic/claude-sonnet-4", apiKey?: string) {
    super();
    this.model = model;
    this.provider = apiKey ? createOpenRouter({ apiKey }) : createOpenRouter();
  }

  protected createLanguageModel(): LanguageModel {
    return this.provider(this.model);
  }
}
