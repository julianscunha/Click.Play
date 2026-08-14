import type { QcCheckResult } from "../types.js";

/**
 * Compara a duração do mp4 final (ffprobe) contra a duração que o
 * `RemotionRenderer` calculou pra o mesmo render (`renderResult.durationInFrames`
 * / fps) — não é uma segunda regra de duração, é o mesmo número que o pipeline
 * já produziu, comparado contra o que de fato foi gravado em disco.
 */
export function checkDurationMatch(
  expectedSeconds: number,
  actualSeconds: number,
  toleranceRatio = 0.05,
): QcCheckResult {
  const diff = Math.abs(actualSeconds - expectedSeconds);
  const diffRatio = expectedSeconds > 0 ? diff / expectedSeconds : diff > 0 ? 1 : 0;
  const passed = diffRatio <= toleranceRatio;
  return {
    id: "duration_match",
    severity: "block",
    passed,
    message: passed
      ? `Duração ${actualSeconds.toFixed(2)}s dentro da tolerância (esperado ${expectedSeconds.toFixed(2)}s)`
      : `Duração ${actualSeconds.toFixed(2)}s diverge de ${expectedSeconds.toFixed(2)}s esperado (${(diffRatio * 100).toFixed(1)}%, tolerância ${(toleranceRatio * 100).toFixed(0)}%)`,
    details: { expectedSeconds, actualSeconds, diffRatio, toleranceRatio },
  };
}
