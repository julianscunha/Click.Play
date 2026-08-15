import type { z } from "zod";
import type { LLMProvider, LLMResult } from "./types.js";

/**
 * Se o modelo primário falhar (quota, "No output generated", timeout — achados
 * em teste manual real), tenta o de fallback antes de propagar o erro. Compõe
 * com o retry-com-backoff já existente em research()/creative-director.ts: cada
 * tentativa deles passa por aqui, então primário+fallback juntos cobrem mais
 * combinações sem duplicar lógica de retry.
 */
export class FallbackLLM implements LLMProvider {
  readonly id: LLMProvider["id"];

  constructor(
    private primary: LLMProvider,
    private fallback: LLMProvider,
  ) {
    this.id = primary.id;
  }

  async generate<T extends z.ZodType>(opts: {
    systemPrompt: string;
    userMessage: string;
    schema: T;
  }): Promise<LLMResult<z.infer<T>>> {
    try {
      return await this.primary.generate(opts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[llm-fallback] primary failed (${msg}), trying fallback model`);
      return await this.fallback.generate(opts);
    }
  }
}
