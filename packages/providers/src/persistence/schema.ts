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
 * Escopo mínimo (decisão do usuário, 10D): só `projects`+`jobs`, o suficiente
 * pra persistir a execução do JobStateMachine/runPipeline (10C). Demais
 * tabelas do spec §31 (scenes/assets/audio_tracks/captions/render_jobs/settings)
 * ficam deferred até existir consumidor real (Fase 11 UI ou além).
 */
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  /** Campos não-provider de PipelineOptions (archetype/pacing/fps/caption/cost...) — ver persistence/types.ts ProjectConfig. */
  config: text("config", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  status: text("status", { enum: JOB_STATUSES }).notNull().default("QUEUED"),
  /** 0..1, derivado do status (ver persistence/job-runner.ts PROGRESS_BY_STATUS) — não input livre. */
  progress: real("progress").notNull().default(0),
  runDir: text("run_dir").notNull(),
  outputPath: text("output_path"),
  estimatedCost: text("estimated_cost", { mode: "json" }).$type<unknown>(),
  actualCost: text("actual_cost", { mode: "json" }).$type<unknown>(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
