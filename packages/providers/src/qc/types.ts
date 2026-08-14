/** Resultado individual de 1 check de QC (docs/IMPLEMENTATION-PLAN.md Fase 12). */
export interface QcCheckResult {
  id: string;
  severity: "block" | "warning";
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * `decision` é o campo topo consumido por Content Factory/Publication
 * (docs/IMPLEMENTATION-PLAN.md §11, decisão #4): BLOCK se qualquer check
 * severity="block" falhar, senão WARNING se qualquer check severity="warning"
 * falhar, senão PASS.
 */
export type QcDecision = "PASS" | "WARNING" | "BLOCK";

export interface QcReport {
  decision: QcDecision;
  checks: QcCheckResult[];
  generatedAt: string;
}
