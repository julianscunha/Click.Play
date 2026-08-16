import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CostBreakdown } from "../cost/index.js";
import type { PipelineCheckpoint } from "../pipeline/types.js";
import type { QcReport } from "../qc/types.js";
import type { ClickPlayDb } from "./client.js";
import { PROGRESS_BY_STATUS, resumeStatusForCheckpoint } from "./job-state-machine.js";
import { jobs, type JobStatus, projects } from "./schema.js";
import { type Job, jobFromRow, type Project, type ProjectConfig, projectFromRow } from "./types.js";

export async function createProject(db: ClickPlayDb, input: { topic: string; config: ProjectConfig }): Promise<Project> {
  const now = new Date();
  const row = { id: randomUUID(), topic: input.topic, config: input.config, createdAt: now, updatedAt: now };
  await db.insert(projects).values(row);
  return projectFromRow(row as never);
}

export async function getProject(db: ClickPlayDb, id: string): Promise<Project | null> {
  const row = await db.select().from(projects).where(eq(projects.id, id)).get();
  return row ? projectFromRow(row) : null;
}

export async function createJob(db: ClickPlayDb, input: { projectId: string; runDir: string }): Promise<Job> {
  const now = new Date();
  const row = {
    id: randomUUID(),
    projectId: input.projectId,
    status: "QUEUED" as JobStatus,
    progress: 0,
    runDir: input.runDir,
    outputPath: null,
    estimatedCost: null,
    actualCost: null,
    qcReport: null,
    checkpoint: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(jobs).values(row);
  return jobFromRow(row as never);
}

export async function getJob(db: ClickPlayDb, id: string): Promise<Job | null> {
  const row = await db.select().from(jobs).where(eq(jobs.id, id)).get();
  return row ? jobFromRow(row) : null;
}

export async function listJobsByProject(db: ClickPlayDb, projectId: string): Promise<Job[]> {
  const rows = await db.select().from(jobs).where(eq(jobs.projectId, projectId)).all();
  return rows.map(jobFromRow);
}

/**
 * Progresso é sempre derivado do status (PROGRESS_BY_STATUS) — não aceita
 * valor livre. FAILED/CANCELLED preservam o progresso do último estágio
 * concluído em vez de zerar (útil pra saber onde o job parou).
 */
export async function updateJobStatus(db: ClickPlayDb, id: string, status: JobStatus): Promise<void> {
  const set: { status: JobStatus; updatedAt: Date; progress?: number } = { status, updatedAt: new Date() };
  if (status !== "FAILED" && status !== "CANCELLED") set.progress = PROGRESS_BY_STATUS[status];
  await db.update(jobs).set(set).where(eq(jobs.id, id));
}

export async function setJobEstimatedCost(db: ClickPlayDb, id: string, cost: CostBreakdown): Promise<void> {
  await db.update(jobs).set({ estimatedCost: cost, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobActualCost(db: ClickPlayDb, id: string, cost: CostBreakdown): Promise<void> {
  await db.update(jobs).set({ actualCost: cost, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobQcReport(db: ClickPlayDb, id: string, qcReport: QcReport): Promise<void> {
  await db.update(jobs).set({ qcReport, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobOutputPath(db: ClickPlayDb, id: string, outputPath: string): Promise<void> {
  await db.update(jobs).set({ outputPath, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobError(db: ClickPlayDb, id: string, error: string): Promise<void> {
  await db.update(jobs).set({ error, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobCheckpoint(db: ClickPlayDb, id: string, checkpoint: PipelineCheckpoint): Promise<void> {
  await db.update(jobs).set({ checkpoint, updatedAt: new Date() }).where(eq(jobs.id, id));
}

const NON_TERMINAL_STATUSES: JobStatus[] = [
  "QUEUED",
  "RESEARCHING",
  "PLANNING",
  "REVIEWING",
  "AWAITING_COST_APPROVAL",
  "GENERATING",
  "RENDERING",
];

/**
 * Execução é fire-and-forget in-process (sem fila externa, decisão do
 * usuário — 10D) — um restart do servidor mata qualquer job em andamento sem
 * chance de persistir erro, deixando o job preso num estado não-terminal pra
 * sempre (sem botão de retry, que só aparece em FAILED). Chamado uma vez no
 * boot: marca como FAILED qualquer job órfão de um restart anterior,
 * preservando o checkpoint já persistido (retry retoma do último estágio pago).
 */
export async function recoverOrphanedJobs(db: ClickPlayDb): Promise<number> {
  const rows = await db.select().from(jobs).all();
  const orphans = rows.filter((row) => NON_TERMINAL_STATUSES.includes(row.status));
  for (const row of orphans) {
    await db
      .update(jobs)
      .set({ status: "FAILED", error: "Job interrompido por reinício do servidor", updatedAt: new Date() })
      .where(eq(jobs.id, row.id));
  }
  return orphans.length;
}

/**
 * Reset administrativo pra retomar um job FAILED (Fase 15+, retry por
 * estágio) — não é transição do pipeline, por isso não passa por
 * `assertTransition`. Só age sobre job em FAILED (idempotente/no-op fora
 * disso); status alvo é derivado do checkpoint já persistido, não input livre.
 */
export async function resetJobForRetry(db: ClickPlayDb, id: string): Promise<Job> {
  const job = await getJob(db, id);
  if (!job) throw new Error(`Job "${id}" não encontrado`);
  if (job.status !== "FAILED") return job;

  const status = resumeStatusForCheckpoint(job.checkpoint);
  const progress = PROGRESS_BY_STATUS[status];
  await db.update(jobs).set({ status, progress, error: null, updatedAt: new Date() }).where(eq(jobs.id, id));
  return { ...job, status, progress, error: null };
}
