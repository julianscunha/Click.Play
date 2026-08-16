import type { MusicMood, MusicProvider, MusicResult } from "./types.js";

/** Mesma ideia de llm/fallback.ts, tts/fallback.ts e image/fallback.ts. */
export class FallbackMusic implements MusicProvider {
  constructor(
    private primary: MusicProvider,
    private fallback: MusicProvider,
  ) {}

  async generate(prompt: string, mood: MusicMood): Promise<MusicResult> {
    try {
      return await this.primary.generate(prompt, mood);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[music-fallback] primary failed (${msg}), trying fallback provider`);
      return await this.fallback.generate(prompt, mood);
    }
  }
}
