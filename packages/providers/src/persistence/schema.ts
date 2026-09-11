import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Estados do job (spec §23). Fluxo linear feliz QUEUED→...→COMPLETED, com
 * FAILED/CANCELLED alcançáveis de qualquer estado não-terminal (docs/IMPLEMENTATION-PLAN.md §Fase 10, 10D).
 */
export const JOB_STATUSES = [
  "QUEUED",
  "RESEARCHING",
  "PLANNING",
  "REVIEWING",
  "AWAITING_COST_APPROVAL",
  "GENERATING",
  "RENDERING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Escopo mínimo (decisão do usuário, 10D): só `productions`+`jobs`, o suficiente
 * pra persistir a execução do JobStateMachine/runPipeline (10C). Demais
 * tabelas do spec §31 (scenes/assets/audio_tracks/captions/render_jobs/settings)
 * ficam deferred até existir consumidor real (Fase 11 UI ou além).
 *
 * Renomeada de `projects` (§11 decisão #1, Fase 16) — essa entidade é uma
 * *config de produção* 1:1 com um job, não um contêiner. "Projeto" (Fase 16)
 * é um conceito novo e diferente (content_projects, agrupa produções/templates).
 */
export const productions = sqliteTable("productions", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  /** Campos não-provider de PipelineOptions (archetype/pacing/fps/caption/cost...) — ver persistence/types.ts ProductionConfig. */
  config: text("config", { mode: "json" }).notNull(),
  /** Projeto (Fase 16) dono desta produção — opcional, produção solta (sem projeto) continua válida. */
  contentProjectId: text("content_project_id").references(() => contentProjects.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * "Projeto" (Fase 16) — entidade contêiner que agrupa produções de um mesmo
 * canal/série (ex. "Histórias do Joãozinho"). Sem coluna de config/schema
 * própria: é só agrupamento hoje, Template (Fase 17) e Scheduler (Fase 19)
 * pendurados nela ainda não existem como tabela.
 */
export const contentProjects = sqliteTable("content_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  productionId: text("production_id")
    .notNull()
    .references(() => productions.id),
  status: text("status", { enum: JOB_STATUSES }).notNull().default("QUEUED"),
  /** 0..1, derivado do status (ver persistence/job-runner.ts PROGRESS_BY_STATUS) — não input livre. */
  progress: real("progress").notNull().default(0),
  runDir: text("run_dir").notNull(),
  outputPath: text("output_path"),
  estimatedCost: text("estimated_cost", { mode: "json" }).$type<unknown>(),
  actualCost: text("actual_cost", { mode: "json" }).$type<unknown>(),
  /** Resultado do QC pós-render (Fase 12) — null até o render completar. */
  qcReport: text("qc_report", { mode: "json" }).$type<unknown>(),
  /** Output de estágios já concluídos (PipelineCheckpoint) — permite retry retomar sem repagar estágios já pagos. */
  checkpoint: text("checkpoint", { mode: "json" }).$type<unknown>(),
  /** Texto livre da sub-etapa atual (ex.: "Gerando cena 3/8 (ai_image)") — só populado durante GENERATING, null nas demais. */
  stageDetail: text("stage_detail"),
  /** Contagem final (imageCount/videoClipCount/audioSeconds, §11A Bloco 6 item 11) — só populado quando status vira COMPLETED. */
  resultSummary: text("result_summary", { mode: "json" }).$type<unknown>(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Saldo de créditos (1 crédito = US$1, decisão do usuário) — linha única
 * `id="default"`, single-user hoje (sem multi-tenant, Fase 22). Debitado na
 * aprovação do custo estimado (`POST /jobs/:id/approve-cost`), reabastecido
 * manualmente via `PUT /credits` (tela Configurações — sem billing real ainda).
 */
export const wallet = sqliteTable("wallet", {
  id: text("id").primaryKey(),
  balanceUsd: real("balance_usd").notNull(),
  consumedUsd: real("consumed_usd").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
