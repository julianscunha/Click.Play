import type { CostBreakdown } from "../cost/index.js";
import type { PipelineCheckpoint, PipelineOptions } from "../pipeline/types.js";
import type { QcReport } from "../qc/types.js";
import type { contentProjects, jobs, JobStatus, productions, ScheduleFrequency, schedules, templates } from "./schema.js";

/** Campos de PipelineOptions que não são instância de provider/runtime — o que sobra fica no `config` da Production. */
export type ProductionConfig = Omit<
  PipelineOptions,
  "topic" | "runDir" | "llm" | "ttsProvider" | "musicProvider" | "resolveElementCtx" | "videoRenderer"
>;

export interface Production {
  id: string;
  topic: string;
  config: ProductionConfig;
  contentProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Entidade contêiner (Fase 16) — agrupa produções de um mesmo canal/série. */
export interface ContentProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Variável declarada num template (Fase 18) — `key` interpolado como `{{key}}` em `config.direction`. */
export interface TemplateVariable {
  key: string;
  label: string;
}

/** Config de produção salvo/reaproveitável (Fase 17) — mesmo shape de `Production.config`. */
export interface Template {
  id: string;
  contentProjectId: string | null;
  name: string;
  version: number;
  config: ProductionConfig;
  sourceProductionId: string | null;
  variableSchema: TemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
}

/** "Agendamento" (Fase 19) — dispara um template numa cadência fixa. */
export interface Schedule {
  id: string;
  templateId: string;
  topic: string;
  frequency: ScheduleFrequency;
  timeOfDay: string;
  dayOfWeek: number | null;
  variableBindings: Record<string, string>;
  enabled: boolean;
  nextRunAt: Date;
  lastRunAt: Date | null;
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
  productionId: string;
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

export type ProductionRow = typeof productions.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type ContentProjectRow = typeof contentProjects.$inferSelect;
export type TemplateRow = typeof templates.$inferSelect;
export type ScheduleRow = typeof schedules.$inferSelect;

export function productionFromRow(row: ProductionRow): Production {
  return {
    id: row.id,
    topic: row.topic,
    config: row.config as ProductionConfig,
    contentProjectId: row.contentProjectId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function contentProjectFromRow(row: ContentProjectRow): ContentProject {
  return { id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export function templateFromRow(row: TemplateRow): Template {
  return {
    id: row.id,
    contentProjectId: row.contentProjectId ?? null,
    name: row.name,
    version: row.version,
    config: row.config as ProductionConfig,
    sourceProductionId: row.sourceProductionId ?? null,
    variableSchema: row.variableSchema ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function scheduleFromRow(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    templateId: row.templateId,
    topic: row.topic,
    frequency: row.frequency,
    timeOfDay: row.timeOfDay,
    dayOfWeek: row.dayOfWeek ?? null,
    variableBindings: row.variableBindings ?? {},
    enabled: row.enabled,
    nextRunAt: row.nextRunAt,
    lastRunAt: row.lastRunAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function jobFromRow(row: JobRow): Job {
  return {
    id: row.id,
    productionId: row.productionId,
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
