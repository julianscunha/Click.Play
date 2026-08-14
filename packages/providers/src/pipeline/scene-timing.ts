import type { Scene, WordTimestamp } from "@clickplay/domain";

/**
 * Divide os WordTimestamp[] (narração inteira, Fase 5) entre as cenas do
 * DirectorScore, proporcional à contagem de palavras de cada scriptLine.
 * O TTS não garante 1:1 entre palavras faladas e palavras do script
 * (números, abreviações) — por isso o fallback proporcional quando a fatia
 * de words[] some antes da cena acabar (mesmo problema descrito em
 * OpenReels src/pipeline/utils.ts splitWordsIntoScenes).
 */
export function splitWordsIntoScenes(scenes: Scene[], words: WordTimestamp[], fps: number): number[] {
  const wordCounts = scenes.map((s) => s.scriptLine.trim().split(/\s+/).filter(Boolean).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const totalDurationS = words.length > 0 ? words[words.length - 1]!.end : 0;

  const durations: number[] = [];
  let cursor = 0;
  let prevEnd = 0;

  for (const count of wordCounts) {
    const slice = words.slice(cursor, cursor + count);
    cursor += count;

    let durationS: number;
    if (slice.length > 0) {
      const sceneEnd = slice[slice.length - 1]!.end;
      durationS = sceneEnd - prevEnd;
      prevEnd = sceneEnd;
    } else if (totalWords > 0) {
      // ponytail: fatia de words[] esgotada antes da última cena — divide o
      // restante da timeline proporcional à contagem de palavras do script.
      durationS = (count / totalWords) * totalDurationS;
    } else {
      durationS = 0;
    }

    durations.push(Math.max(1, Math.round(durationS * fps)));
  }

  return durations;
}
