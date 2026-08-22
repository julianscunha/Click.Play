import { z } from "zod";
import type { IntroOutroConfig, Scene } from "@clickplay/domain";
import type { ResearchResult } from "../agents/research.js";
import type { LLMProvider } from "../llm/types.js";

const GeneratedCopy = z.object({ text: z.string().min(1) });

const PROMPT_BY_KIND = {
  intro: "Write a punchy 1-sentence hook to open a short-form video",
  outro: "Write a punchy 1-sentence closing call-to-action to end a short-form video",
} as const;

/**
 * Monta a Scene sintética de abertura/encerramento (docs/IMPLEMENTATION-PLAN.md
 * §11A Bloco 5) — reaproveita 100% o motor existente (animated_text +
 * transition), sem componente novo de render. Texto explícito do usuário tem
 * prioridade; se vazio, 1 LLM call gera a partir do research já feito. Modo
 * "upload" não é resolvido aqui (Fase 15, precisa endpoint de upload de
 * arquivo que ainda não existe).
 */
export async function resolveIntroOutroScene(
  config: IntroOutroConfig | undefined,
  kind: "intro" | "outro",
  llm: LLMProvider,
  topic: string,
  research: ResearchResult,
  language?: string,
): Promise<Scene | null> {
  if (!config || config.mode !== "generated") return null;

  const text =
    config.text?.trim() ||
    (
      await llm.generate({
        systemPrompt: "You write short, punchy video copy. Return only the requested sentence, no quotes.",
        userMessage: `${PROMPT_BY_KIND[kind]} about "${topic}". Context: ${research.summary}.${
          language ? ` Write in ${language}.` : ""
        }`,
        schema: GeneratedCopy,
      })
    ).data.text;

  return {
    id: kind,
    visualStrategy: "motion_graphics",
    elements: [{ type: "animated_text", text, position: "center" }],
    scriptLine: text,
    transition: config.transition ?? "crossfade",
  };
}
