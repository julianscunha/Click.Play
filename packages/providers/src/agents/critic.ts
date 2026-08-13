import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { PACING_CONFIG } from "./creative-director.js";
import type { DirectorScore } from "./creative-director.js";
import { getArchetype } from "../config/archetype-registry.js";
import type { ScenePacing } from "../config/archetype.js";
import type { LLMProvider, LLMUsage } from "../llm/types.js";

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "prompts", "critic.md");

const CritiqueResult = z.object({
  score: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  revision_needed: z.boolean(),
  revision_instructions: z.string().nullable(),
  weakest_scene_index: z.number().nullable(),
});
export type CritiqueResult = z.infer<typeof CritiqueResult>;

export interface CritiqueOutput {
  data: CritiqueResult;
  usage: LLMUsage;
}

/** Adaptado de OpenReels src/agents/critic.ts (MIT) — sem mudança de modelo visual, o critic avalia o DirectorScore como um todo (JSON). */
export async function evaluate(
  llm: LLMProvider,
  score: DirectorScore,
  topic: string,
  pacingOverride?: string,
): Promise<CritiqueOutput> {
  let systemPrompt =
    "You are a video quality critic. Evaluate the DirectorScore for hook strength, visual variety/composition (motion graphics vs plain static images), pacing, script quality, and overall coherence. Score 1-10. If below 7, provide specific revision instructions targeting the weakest scene.";

  try {
    systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  } catch {
    // Use default
  }

  let pacingTier: ScenePacing = "moderate";
  if (pacingOverride && pacingOverride in PACING_CONFIG) {
    pacingTier = pacingOverride as ScenePacing;
  } else {
    try {
      pacingTier = getArchetype(score.archetype).scenePacing;
    } catch {
      // Unknown archetype — default to moderate
    }
  }

  const PACING_RANGES = Object.fromEntries(
    Object.entries(PACING_CONFIG).map(([tier, cfg]) => [
      tier,
      `${cfg.min}-${cfg.max} scenes, ${cfg.wordsPerScene} words per scene, ${cfg.totalWords} total words`,
    ]),
  ) as Record<ScenePacing, string>;

  const userMessage = `Topic: ${topic}

This video uses **${pacingTier}** pacing (${PACING_RANGES[pacingTier]}).
Evaluate pacing against these tier-specific thresholds, NOT a fixed "5-7 scenes" standard.

DirectorScore:
${JSON.stringify(score, null, 2)}

Evaluate this video plan. Score it 1-10. If it scores below 7, identify the weakest scene and provide specific revision instructions.`;

  const result = await llm.generate({ systemPrompt, userMessage, schema: CritiqueResult });
  return { data: result.data, usage: result.usage };
}
