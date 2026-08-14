import type { CostAmount } from "../../cost/types.js";
import type { QcCheckResult } from "../types.js";

/** Desvio custo real vs estimado >30% — WARNING (custo já ocorreu, bloquear não desfaz o gasto). */
export function checkCostDeviation(estimated: CostAmount, actual: CostAmount, maxDeviationRatio = 0.3): QcCheckResult {
  if (estimated.status === "unknown" || actual.status === "unknown") {
    return {
      id: "cost_deviation",
      severity: "warning",
      passed: true,
      message: "Custo estimado ou real desconhecido — check pulado",
      details: { estimated, actual },
    };
  }

  const diff = actual.usd - estimated.usd;
  const diffRatio = estimated.usd > 0 ? Math.abs(diff) / estimated.usd : diff > 0 ? 1 : 0;
  const passed = diffRatio <= maxDeviationRatio;
  return {
    id: "cost_deviation",
    severity: "warning",
    passed,
    message: passed
      ? `Custo real $${actual.usd.toFixed(4)} dentro da tolerância (estimado $${estimated.usd.toFixed(4)})`
      : `Custo real $${actual.usd.toFixed(4)} diverge de $${estimated.usd.toFixed(4)} estimado (${(diffRatio * 100).toFixed(1)}%)`,
    details: { estimatedUsd: estimated.usd, actualUsd: actual.usd, diffUsd: diff, diffRatio, maxDeviationRatio },
  };
}
