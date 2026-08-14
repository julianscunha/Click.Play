import type { MusicMood } from "@clickplay/domain";
import { selectTrack } from "./bundled.js";
import type { MusicProvider, MusicResult } from "./types.js";

/**
 * Provider default de música (docs/IMPLEMENTATION-PLAN.md §Fase 7): biblioteca
 * bundled royalty-free. Ignora o prompt — seleciona faixas só pelo mood enum.
 */
export class BundledMusic implements MusicProvider {
  async generate(_prompt: string, mood: MusicMood): Promise<MusicResult> {
    const selection = selectTrack(mood);
    if (!selection) throw new Error("No bundled tracks available");
    return { filePath: selection.filePath };
  }
}
