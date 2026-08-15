import type { TTSProvider, TTSResult } from "./types.js";

/** Mesma ideia de llm/fallback.ts — se o primário (já com seu próprio retry
 * interno) falhar de vez, tenta o secundário antes de propagar o erro. */
export class FallbackTTS implements TTSProvider {
  constructor(
    private primary: TTSProvider,
    private fallback: TTSProvider,
  ) {}

  async generate(text: string): Promise<TTSResult> {
    try {
      return await this.primary.generate(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[tts-fallback] primary failed (${msg}), trying fallback provider`);
      return await this.fallback.generate(text);
    }
  }
}
