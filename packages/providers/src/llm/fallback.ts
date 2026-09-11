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
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[llm-fallback] primary failed (${primaryMsg}), trying fallback model`);
      try {
        return await this.fallback.generate(opts);
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        // Encadeia as duas mensagens (não só a última) — mesmo achado do
        // tts/fallback.ts: só o erro do fallback escondia se o primário
        // falhou pela mesma razão ou por outra completamente diferente.
        throw new Error(`${primaryMsg} → ${fallbackMsg}`);
      }
    }
  }
}
