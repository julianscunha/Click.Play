import type { CostBreakdown } from "../cost/index.js";
import { runPipeline } from "../pipeline/orchestrator.js";
import type { PipelineCallbacks, PipelineOptions } from "../pipeline/types.js";
import type { ClickPlayDb } from "./client.js";
import { assertTransition } from "./job-state-machine.js";
import {
  getJob,
  getProject,
  setJobActualCost,
  setJobError,
  setJobEstimatedCost,
  setJobOutputPath,
  updateJobStatus,
} from "./repository.js";
import type { JobStatus } from "./schema.js";

/** Providers/runtime que não são persistidos (ver persistence/types.ts ProjectConfig). */
export interface JobRunnerDeps
  extends Pick<PipelineOptions, "llm" | "ttsProvider" | "musicProvider" | "resolveElementCtx" | "videoRenderer"> {}

export interface StartJobOptions {
  /** Política de aprovação de custo — quem chama decide (mesmo contrato de PipelineCallbacks.onCostEstimate). Default: auto-aprova (sem UI ainda). */
  approveCost?(estimate: CostBreakdown): Promise<boolean> | boolean;
  onLog?(message: string): void;
}

/**
 * Fecha o ciclo QUEUED→...→COMPLETED/FAILED/CANCELLED (10D): busca job+project
 * persistidos, roda runPipeline (10C) com callbacks que avançam a
 * JobStateMachine e persistem progresso/custo/erro a cada estágio. Roda em
 * background — não bloqueia quem chama (fire-and-forget "in-process",
 * decisão do usuário: sem BullMQ/Redis nesta fase; trocar o executor por
 * worker/queue depois não deve exigir reescrever runPipeline).
 */
export function startJob(db: ClickPlayDb, jobId: string, deps: JobRunnerDeps, opts: StartJobOptions = {}): void {
  void runJobOnce(db, jobId, deps, opts).catch((err) => {
    // Salvaguarda: runPipeline já captura erros de estágio e retorna "failed"
    // sem lançar — isto só cobre falha inesperada fora do pipeline (ex: DB).
    void setJobError(db, jobId, err instanceof Error ? err.message : String(err));
  });
}

/** Mesma execução de `startJob`, mas retorna a Promise — usado por testes que precisam aguardar o ciclo completo determinístico. */
export async function runJobOnce(
  db: ClickPlayDb,
  jobId: string,
  deps: JobRunnerDeps,
  opts: StartJobOptions = {},
): Promise<void> {
  const job = await getJob(db, jobId);
  if (!job) throw new Error(`Job "${jobId}" não encontrado`);
  const project = await getProject(db, job.projectId);
  if (!project) throw new Error(`Project "${job.projectId}" não encontrado`);

  let status: JobStatus = job.status;
  const transition = async (to: JobStatus) => {
    assertTransition(status, to);
    status = to;
    await updateJobStatus(db, jobId, to);
  };

  const callbacks: PipelineCallbacks = {
    async onStageStart(stage) {
      if (stage === "research") await transition("RESEARCHING");
      if (stage === "director") await transition("PLANNING");
      if (stage === "tts") await transition("GENERATING");
      if (stage === "render") await transition("RENDERING");
    },
    async onCostEstimate(estimate) {
      await transition("REVIEWING");
      await setJobEstimatedCost(db, jobId, estimate);
      await transition("AWAITING_COST_APPROVAL");
      const approve = opts.approveCost ?? (() => true);
      return approve(estimate);
    },
    async onStageError(stageName, error) {
      opts.onLog?.(`[${stageName}] ${error.message}`);
    },
    onLog: opts.onLog,
  };

  const pipelineOptions: PipelineOptions = {
    ...project.config,
    topic: project.topic,
    runDir: job.runDir,
    ...deps,
  };

  const result = await runPipeline(pipelineOptions, callbacks);

  switch (result.status) {
    case "completed":
      await setJobActualCost(db, jobId, result.costActual);
      await setJobOutputPath(db, jobId, result.outputPath);
      await transition("COMPLETED");
      break;
    case "cancelled_cost":
      await setJobError(db, jobId, "Job cancelado: custo estimado não aprovado");
      await transition("CANCELLED");
      break;
    case "cancelled":
      await transition("CANCELLED");
      break;
    case "failed":
      await setJobError(db, jobId, `[${result.stage}] ${result.error.message}`);
      await transition("FAILED");
      break;
  }
}
