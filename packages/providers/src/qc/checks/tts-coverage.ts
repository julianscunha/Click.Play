import type { QcCheckResult } from "../types.js";

/** Cobertura de `words[]` (TTS) vs contagem de palavras do script (WARNING — TTS truncar não é incomum). */
export function checkTtsCoverage(scriptWordCount: number, coveredWordCount: number, minRatio = 0.9): QcCheckResult {
  const ratio = scriptWordCount > 0 ? coveredWordCount / scriptWordCount : 1;
  const passed = ratio >= minRatio;
  return {
    id: "tts_coverage",
    severity: "warning",
    passed,
    message: passed
      ? `Cobertura TTS ${(ratio * 100).toFixed(1)}%`
      : `Cobertura TTS ${(ratio * 100).toFixed(1)}% abaixo do mínimo ${(minRatio * 100).toFixed(0)}% (${coveredWordCount}/${scriptWordCount} palavras)`,
    details: { scriptWordCount, coveredWordCount, ratio, minRatio },
  };
}
