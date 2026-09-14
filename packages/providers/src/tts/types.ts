import type { WordTimestamp } from "@clickplay/domain";

/** Um trecho de narração (1 cena) com metadados de entonação — permite pausas
 * entre cenas, prosódia por arquétipo e ênfase em palavras-chave numa única
 * chamada de TTS. `generate` aceita `string` puro por retrocompat (equivale
 * a `[{ text }]`). */
export interface TTSSegment {
  text: string;
  /** Pausa depois deste segmento, em ms — 0/undefined = sem pausa extra. */
  pauseAfterMs?: number;
  /** SSML prosody rate, ex. "+10%"/"-10%"/"default". */
  rate?: string;
  pitch?: string;
  /** Palavras literais deste segmento (cópia de scene.scriptLine) que merecem ênfase vocal. */
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
