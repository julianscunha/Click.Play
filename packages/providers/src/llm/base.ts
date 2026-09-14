import type { LanguageModel } from "ai";
import { generateText, Output } from "ai";
import type { z } from "zod";
import type { LLMProvider, LLMProviderKey, LLMResult } from "./types.js";

/**
 * Base para LLM providers via Vercel AI SDK. Adaptado de OpenReels
 * `src/providers/llm/base.ts` (MIT) — a variante two-pass de web search foi
 * removida: Click.Play não usa research com busca na web (docs/IMPLEMENTATION-PLAN.md,
 * decisão "Sem Tavily", item 2), então essa ramificação não teria consumidor.
 */
export abstract class BaseLLM implements LLMProvider {
  abstract readonly id: LLMProviderKey;

  protected abstract createLanguageModel(): LanguageModel;

  async generate<T extends z.ZodType>(opts: {
    systemPrompt: string;
    userMessage: string;
    schema: T;
  }): Promise<LLMResult<z.infer<T>>> {
    const result = await generateText({
      model: this.createLanguageModel(),
      system: opts.systemPrompt,
      prompt: opts.userMessage,
      output: Output.object({ schema: opts.schema }),
      // Achado em teste manual real: "No object generated: could not parse the
      // response" na revisão do DirectorScore — sem limite explícito, o SDK
      // usa o default do provider/modelo, que pode truncar a saída no meio de
      // um JSON grande (roteiro com várias cenas). Generoso o bastante pro
      // maior schema (DirectorScore completo), barato pros schemas pequenos.
      maxOutputTokens: 8192,
    });

    if (result.output == null) {
      throw new Error(`${this.id} did not return structured output`);
    }

    return {
      data: result.output as z.infer<T>,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      },
    };
  }
}
