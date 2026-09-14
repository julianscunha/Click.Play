import type { ImageProvider } from "./types.js";

/** Mesma ideia de llm/fallback.ts e tts/fallback.ts. */
export class FallbackImage implements ImageProvider {
  constructor(
    private primary: ImageProvider,
    private fallback: ImageProvider,
  ) {}

  async generate(prompt: string, style?: string): Promise<Buffer> {
    try {
      return await this.primary.generate(prompt, style);
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[image-fallback] primary failed (${primaryMsg}), trying fallback provider`);
      try {
        return await this.fallback.generate(prompt, style);
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
