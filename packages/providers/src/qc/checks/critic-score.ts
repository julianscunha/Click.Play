import type { RevisionLogEntry } from "../../pipeline/types.js";
import type { QcCheckResult } from "../types.js";

/**
 * Score final do Critic abaixo do threshold após revisões esgotadas — WARNING,
 * não BLOCK (decisão do usuário, docs/IMPLEMENTATION-PLAN.md §11/Fase 12): o
 * Critic é avaliação subjetiva/LLM, o pipeline já tentou corrigir via loop
 * Director↔Critic, não bloqueia entrega automática por isso.
 */
export function checkCriticScore(revisions: RevisionLogEntry[], threshold = 7): QcCheckResult {
  const final = revisions.at(-1);
  const finalScore = final?.score ?? 0;
  const passed = finalScore >= threshold;
  return {
    id: "critic_score",
    severity: "warning",
    passed,
    message: passed
      ? `Critic score final ${finalScore} (>= ${threshold})`
      : `Critic score final ${finalScore} abaixo do threshold ${threshold} após ${revisions.length - 1} revisão(ões)`,
    details: { finalScore, threshold, revisionsAttempted: revisions.length - 1, revisionHistory: revisions },
  };
}
