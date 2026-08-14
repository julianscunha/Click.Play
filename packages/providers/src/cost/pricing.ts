/**
 * Tabelas de preço pra estimativa de custo (Fase 10A). Valores hardcoded,
 * precisam revisão periódica (risco documentado desde a auditoria original,
 * docs/IMPLEMENTATION-PLAN.md §8 Riscos #4) — datados de mar/2026, herdados
 * do cost-estimator.ts do OpenReels onde aplicável.
 *
 * LLM é chaveado por MODELO (não por provider largo): OpenRouter proxya
 * modelos variados com preços diferentes, um bucket "openrouter" único não
 * reflete custo real. Qualquer modelo/provider fora da tabela é "unknown",
 * nunca custo zero.
 */

export const LLM_PRICING_PER_MODEL: Record<string, { perInputToken: number; perOutputToken: number }> = {
  "anthropic/claude-sonnet-4.6": { perInputToken: 3 / 1_000_000, perOutputToken: 15 / 1_000_000 },
  "openai/gpt-4.1": { perInputToken: 2 / 1_000_000, perOutputToken: 8 / 1_000_000 },
  "google/gemini-2.5-flash": { perInputToken: 0.1 / 1_000_000, perOutputToken: 0.4 / 1_000_000 },
};

export const TTS_PRICING_PER_CHAR: Record<string, number> = {
  edge: 0, // grátis — TTS default do Click.Play (Fase 5), sem conta/API key
  elevenlabs: 0.00018,
  "openai-tts": 0.00005,
};

export const IMAGE_PRICING_PER_IMAGE: Record<string, number> = {
  gemini: 0.101, // Gemini 3.1 Flash Image @ 1080x1920 (Fase 6)
};

export const VIDEO_PRICING_PER_SECOND: Record<string, number> = {
  gemini: 0.05, // Veo 3.1 Lite (Fase 6)
  fal: 0.07, // Kling v2.6 Pro via fal.ai (Fase 6)
};

export const MUSIC_PRICING_PER_TRACK: Record<string, number> = {
  bundled: 0, // grátis — default do Click.Play (Fase 7)
  lyria: 0.08, // confirmado pago na Fase 7, upgrade manual
};

/** Duração assumida de um clipe ai_video_clip na estimativa pré-run (Scene não carrega duração explícita até o alinhamento de TTS, Fase 5). */
export const AI_VIDEO_ESTIMATE_DURATION_SECONDS = 6;

/** Estimativa de tokens por tipo de chamada LLM no pipeline (Research/Director/Critic/prompters). */
export const LLM_CALL_TOKEN_ESTIMATES = {
  research: { input: 2000, output: 1000 },
  creativeDirector: { input: 5000, output: 2000 },
  critic: { input: 3000, output: 500 },
  imagePrompter: { input: 800, output: 200 },
};
