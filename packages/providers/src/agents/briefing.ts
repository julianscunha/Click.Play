import { z } from "zod";
import type { LLMProvider } from "../llm/types.js";

export const BRIEFING_LENGTHS = ["compact", "balanced", "verbose"] as const;
export type BriefingLength = (typeof BRIEFING_LENGTHS)[number];

const LENGTH_INSTRUCTION: Record<BriefingLength, string> = {
  compact: "1-2 short sentences (roughly 30-40 words).",
  balanced: "3-4 sentences (roughly 60-90 words).",
  verbose: "5-7 sentences (roughly 120-180 words), covering more narrative detail.",
};

const BriefingResult = z.object({ direction: z.string() });

/**
 * §11A Bloco 7 — expande um tema (`topic`) num rascunho de briefing (`direction`) revisável ANTES da
 * geração cara rodar, pra usuário saber o que vai ser narrado sem esperar o pipeline inteiro. 1 chamada
 * de LLM só, sem retry (diferente de `research()`): é um atalho de UI, falha aqui só mostra erro e deixa
 * o usuário tentar de novo ou escrever na mão — não trava nenhum job.
 */
export async function expandBriefing(
  llm: LLMProvider,
  topic: string,
  length: BriefingLength,
  language?: string,
): Promise<string> {
  const languageInstruction = language ? ` Write in ${language}.` : "";
  const systemPrompt =
    "You write short creative-direction briefs for a short-form video script. Given a topic, write a " +
    "'direction' brief: target audience, tone, and anything that must be included. Do not write the script " +
    "itself, only the direction for whoever writes it." +
    languageInstruction;
  const userMessage = `Topic: ${topic}\n\nLength: ${LENGTH_INSTRUCTION[length]}`;

  const result = await llm.generate({ systemPrompt, userMessage, schema: BriefingResult });
  return result.data.direction;
}
