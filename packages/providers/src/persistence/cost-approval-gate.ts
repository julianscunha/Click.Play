/**
 * Ponte entre o job parado em AWAITING_COST_APPROVAL (job-runner.ts,
 * `onCostEstimate`) e uma decisão que chega depois, fora do ciclo síncrono
 * de `runPipeline` — ex: `POST /jobs/:id/approve-cost` na API. Em memória,
 * por processo (mesmo modelo fire-and-forget in-process do job-runner, sem
 * fila/worker externo nesta fase).
 */
export interface CostApprovalGate {
  /** Chamado por `onCostEstimate` — resolve quando `resolveApproval` for chamado pro mesmo jobId. */
  waitForApproval(jobId: string): Promise<boolean>;
  /** Chamado pelo endpoint de aprovação. Idempotente: no-op (retorna `false`) se não houver espera pendente pra esse jobId — segunda chamada não dispara nada de novo. */
  resolveApproval(jobId: string, approved: boolean): boolean;
}

export function createCostApprovalGate(): CostApprovalGate {
  const pending = new Map<string, (approved: boolean) => void>();

  return {
    waitForApproval(jobId) {
      return new Promise<boolean>((resolve) => {
        pending.set(jobId, (approved) => {
          pending.delete(jobId);
          resolve(approved);
        });
      });
    },
    resolveApproval(jobId, approved) {
      const resolve = pending.get(jobId);
      if (!resolve) return false;
      resolve(approved);
      return true;
    },
  };
}
