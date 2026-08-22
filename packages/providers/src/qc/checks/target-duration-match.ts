import type { QcCheckResult } from "../types.js";

/**
 * Compara a duração real do render contra a duração-alvo pedida pelo produtor
 * (`targetDurationSeconds`, §11A Bloco 2 item 4) — diferente de `duration_match`
 * (que verifica o mp4 gravado contra o que o próprio render calculou, sem
 * relação com o pedido do usuário). Severity "warning": duração real é
 * subproduto de quantas cenas/palavras o LLM decidiu escrever dentro do
 * orçamento (`sceneCapForDuration`), não uma garantia exata — tolerância bem
 * mais larga que `duration_match`.
 */
export function checkTargetDurationMatch(
  targetSeconds: number,
  actualSeconds: number,
  toleranceRatio = 0.2,
): QcCheckResult {
  const diff = Math.abs(actualSeconds - targetSeconds);
  const diffRatio = targetSeconds > 0 ? diff / targetSeconds : diff > 0 ? 1 : 0;
  const passed = diffRatio <= toleranceRatio;
  return {
    id: "target_duration_match",
    severity: "warning",
    passed,
    message: passed
      ? `Duração ${actualSeconds.toFixed(2)}s dentro da tolerância do alvo (${targetSeconds}s)`
      : `Duração ${actualSeconds.toFixed(2)}s diverge do alvo de ${targetSeconds}s (${(diffRatio * 100).toFixed(1)}%, tolerância ${(toleranceRatio * 100).toFixed(0)}%)`,
    details: { targetSeconds, actualSeconds, diffRatio, toleranceRatio },
  };
}
