import type { z } from "zod";
import { withFallback } from "../http/with-fallback.js";
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

  generate<T extends z.ZodType>(opts: { systemPrompt: string; userMessage: string; schema: T }): Promise<LLMResult<z.infer<T>>> {
    return withFallback(
      "llm-fallback",
      () => this.primary.generate(opts),
      () => this.fallback.generate(opts),
    );
  }
}
