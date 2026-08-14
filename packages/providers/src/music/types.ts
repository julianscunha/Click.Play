import type { MusicMood } from "@clickplay/domain";

export type { MusicMood };
export type MusicProviderKey = "bundled" | "lyria";

export interface MusicResult {
  filePath: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface MusicProvider {
  generate(prompt: string, mood: MusicMood): Promise<MusicResult>;
}
