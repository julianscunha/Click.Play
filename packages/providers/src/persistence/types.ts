import type { CostBreakdown } from "../cost/index.js";
import type { PipelineCheckpoint, PipelineOptions } from "../pipeline/types.js";
import type { QcReport } from "../qc/types.js";
import type { jobs, JobStatus, projects } from "./schema.js";

/** Campos de PipelineOptions que não são instância de provider/runtime — o que sobra fica no `config` do Project. */
export type ProjectConfig = Omit<
  PipelineOptions,
  "topic" | "runDir" | "llm" | "ttsProvider" | "musicProvider" | "resolveElementCtx" | "videoRenderer"
>;

export interface Project {
  id: string;
  topic: string;
  config: ProjectConfig;
  createdAt: Date;
  updatedAt: Date;
}

/** Contagem final do job concluído (§11A Bloco 6 item 11) — dado já calculado pelo orchestrator, só exposto. */
export interface ResultSummary {
  imageCount: number;
  videoClipCount: number;
  audioSeconds: number;
}

export interface Job {
  id: string;
  projectId: string;
  status: JobStatus;
  progress: number;
  runDir: string;
  outputPath: string | null;
  estimatedCost: CostBreakdown | null;
  actualCost: CostBreakdown | null;
  qcReport: QcReport | null;
  checkpoint: PipelineCheckpoint | null;
  stageDetail: string | null;
  resultSummary: ResultSummary | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectRow = typeof projects.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;

export function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    topic: row.topic,
    config: row.config as ProjectConfig,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function jobFromRow(row: JobRow): Job {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    progress: row.progress,
    runDir: row.runDir,
    outputPath: row.outputPath,
    estimatedCost: (row.estimatedCost as CostBreakdown | null) ?? null,
    actualCost: (row.actualCost as CostBreakdown | null) ?? null,
    qcReport: (row.qcReport as QcReport | null) ?? null,
    checkpoint: (row.checkpoint as PipelineCheckpoint | null) ?? null,
    stageDetail: row.stageDetail ?? null,
    resultSummary: (row.resultSummary as ResultSummary | null) ?? null,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
