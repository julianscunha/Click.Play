import type { WordTimestamp } from "@clickplay/domain";

export interface TTSResult {
  audio: Buffer;
  words: WordTimestamp[];
}

export interface TTSProvider {
  generate(text: string): Promise<TTSResult>;
}
