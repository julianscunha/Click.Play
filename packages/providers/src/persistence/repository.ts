import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CostBreakdown } from "../cost/index.js";
import type { ClickPlayDb } from "./client.js";
import { PROGRESS_BY_STATUS } from "./job-state-machine.js";
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

export async function setJobOutputPath(db: ClickPlayDb, id: string, outputPath: string): Promise<void> {
  await db.update(jobs).set({ outputPath, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function setJobError(db: ClickPlayDb, id: string, error: string): Promise<void> {
  await db.update(jobs).set({ error, updatedAt: new Date() }).where(eq(jobs.id, id));
}
