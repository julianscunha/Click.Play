import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { LLMProvider, LLMUsage } from "../llm/types.js";

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "prompts", "researcher.md");

const ResearchResult = z.object({
  summary: z.string(),
  key_facts: z.array(z.string()),
  mood: z.string(),
});
export type ResearchResult = z.infer<typeof ResearchResult>;

export interface ResearchOutput {
  data: ResearchResult;
  usage: LLMUsage;
}

/**
 * Adaptado de OpenReels src/agents/research.ts (MIT). Sem web search (decisão
 * "Sem Tavily" — docs/IMPLEMENTATION-PLAN.md, item 2): o LLM usa conhecimento
 * próprio, então o campo `sources` do original foi removido (não há como
 * citar fonte real sem busca).
 */
export async function research(llm: LLMProvider, topic: string): Promise<ResearchOutput> {
  let systemPrompt =
    "You are a research assistant. Given a topic, use your training knowledge to produce a structured research summary with key facts and mood/tone for a short-form video script. You do not have web access — never invent specific sources, dates, or statistics you are not confident about.";

  try {
    systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  } catch {
    // Use default prompt if file doesn't exist
  }

  const result = await llm.generate({
    systemPrompt,
    userMessage: `Research this topic for a short-form video script: ${topic}`,
    schema: ResearchResult,
  });
  return { data: result.data, usage: result.usage };
}
