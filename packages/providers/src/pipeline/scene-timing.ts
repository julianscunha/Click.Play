import type { Scene, WordTimestamp } from "@clickplay/domain";

/** Velocidade média de fala (palavras/segundo) usada só quando a narração está desligada. */
export const DEFAULT_WORDS_PER_SECOND = 2.5;

/**
 * Substitui os WordTimestamp[] do TTS quando a narração está desligada
 * (§11A, "Narração opcional") — fabrica timing sintético a partir da
 * velocidade média de fala, no mesmo shape que o TTS produziria. Isso deixa
 * `splitWordsIntoScenes` (duração de cena) e a legenda (que também consome
 * WordTimestamp[]) funcionando sem mudança nenhuma, vídeo mudo ou não.
 */
export function synthesizeWordTimestamps(
  scenes: Scene[],
  wordsPerSecond: number = DEFAULT_WORDS_PER_SECOND,
): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  let t = 0;
  for (const scene of scenes) {
    for (const word of scene.scriptLine.trim().split(/\s+/).filter(Boolean)) {
      const end = t + 1 / wordsPerSecond;
      words.push({ word, start: t, end });
      t = end;
    }
  }
  return words;
}

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
