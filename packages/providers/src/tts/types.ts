import type { WordTimestamp } from "@clickplay/domain";

/** Um trecho de narração (1 cena) com metadados de entonação — permite pausas
 * (aproximadas, ver edge.ts) entre cenas e prosódia por arquétipo numa única
 * chamada de TTS. `generate` aceita `string` puro por retrocompat (equivale
 * a `[{ text }]`). */
export interface TTSSegment {
  text: string;
  /** Pausa depois deste segmento, em ms — 0/undefined = sem pausa extra. Aproximada por
   * reticências no texto (edge.ts), não um `<break>` SSML real: o endpoint do Edge TTS
   * usado aqui rejeita `<break>`/múltiplos elementos SSML (achado em teste manual real
   * contra o serviço, não simulado). */
  pauseAfterMs?: number;
  /** SSML prosody rate, ex. "+10%"/"-10%"/"default". */
  rate?: string;
  pitch?: string;
  /** Palavras literais deste segmento (cópia de scene.scriptLine) — hoje só alimenta a
   * ênfase VISUAL da legenda (scene-timing.ts resolveEmphasisIndices). Ênfase vocal via
   * `<emphasis>` SSML foi tentada e descartada: o mesmo endpoint do Edge TTS rejeita a
   * tag (mesma limitação do pauseAfterMs acima). */
  emphasisWords?: string[];
}

export interface TTSResult {
  audio: Buffer;
  words: WordTimestamp[];
  /** true = timing estimado proporcionalmente (Gemini/OpenRouter TTS), não medido de
   * verdade como o Edge TTS (WordBoundary nativo) — legenda pode dessincronizar por
   * palavra dentro de um chunk. Undefined/false = timing real. */
  estimatedTiming?: boolean;
}

export interface TTSProvider {
  generate(input: string | TTSSegment[]): Promise<TTSResult>;
}
