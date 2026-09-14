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
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[music-fallback] primary failed (${primaryMsg}), trying fallback provider`);
      try {
        return await this.fallback.generate(prompt, mood);
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        // Encadeia as duas mensagens (mesmo achado de tts/fallback.ts) — só o
        // erro do fallback escondia se o primário falhou pela mesma razão ou
        // por outra completamente diferente.
        throw new Error(`${primaryMsg} → ${fallbackMsg}`);
      }
    }
  }
}
