import type { TTSProvider, TTSResult, TTSSegment } from "./types.js";

/** Mesma ideia de llm/fallback.ts — se o primário (já com seu próprio retry
 * interno) falhar de vez, tenta o secundário antes de propagar o erro. */
export class FallbackTTS implements TTSProvider {
  constructor(
    private primary: TTSProvider,
    private fallback: TTSProvider,
  ) {}

  async generate(input: string | TTSSegment[]): Promise<TTSResult> {
    try {
      return await this.primary.generate(input);
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[tts-fallback] primary failed (${primaryMsg}), trying fallback provider`);
      try {
        return await this.fallback.generate(input);
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        // Encadeia as duas mensagens (não só a última) — com 3 providers em
        // cascata (buildTTS aninha FallbackTTS 2x), só o erro do último
        // provider tentado escondia que os anteriores também falharam,
        // levando a diagnóstico errado (achado real: usuário investigou o
        // erro do 3º provider quando a causa era o 2º).
        throw new Error(`${primaryMsg} → ${fallbackMsg}`);
      }
    }
  }
}
