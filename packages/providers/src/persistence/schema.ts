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

/**
 * "Template" (Fase 17) — config de produção salvo/reaproveitável, copiado de uma
 * `production` concluída. `config` é o mesmo shape json de `productions.config`
 * (PipelineOptions sem provider/topic/runDir) — decisão da Fase 10 de manter esse
 * objeto serializável e livre de instância de provider paga dividendo aqui sem
 * mudança nenhuma. `name` não é único no schema — unicidade (mesmo nome
 * sobrescreve, decisão do usuário) é responsabilidade do repository, não de
 * constraint de banco, pra manter a mensagem de erro amigável no caller.
 */
export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  contentProjectId: text("content_project_id").references(() => contentProjects.id),
  name: text("name").notNull(),
  /** Incrementada a cada "salvar como template" com o mesmo nome (sobrescreve o config, guarda a contagem). */
  version: integer("version").notNull().default(1),
  config: text("config", { mode: "json" }).notNull(),
  sourceProductionId: text("source_production_id").references(() => productions.id),
  /** Fase 18: lista de {key, label} pra interpolar {{key}} em `config.direction` — null/[] = template sem variável. */
  /** `kind` (Fase 20, default "literal" quando ausente — templates antigos não têm o campo):
   * "generative" usa `label` como instrução pro LLM gerar o valor sozinho (Scheduler, sem humano
   * preenchendo form) em vez de um rótulo pra input manual (Wizard/ScheduleView). */
  variableSchema: text("variable_schema", { mode: "json" }).$type<
    { key: string; label: string; kind?: "literal" | "generative" }[]
  >(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const SCHEDULE_FREQUENCIES = ["daily", "weekly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

/**
 * "Agendamento" (Fase 19) — dispara `template` numa cadência fixa (decisão do usuário: intervalo simples
 * "diário"/"semanal" + horário, não cron cru — sem dependência nova, sem expor sintaxe cron na WebUI).
 * `topic` mora aqui (não em `templates.config`, que nunca guardou topic — Fase 17) porque um agendamento
 * precisa de tema pra cada produção disparada sem intervenção humana.
 */
export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => templates.id),
  topic: text("topic").notNull(),
  frequency: text("frequency", { enum: SCHEDULE_FREQUENCIES }).notNull(),
  /** "HH:mm", 24h, horário local do processo (single-user/self-hosted — sem timezone por agendamento). */
  timeOfDay: text("time_of_day").notNull(),
  /** 0 (domingo) a 6 (sábado) — só usado/obrigatório quando `frequency === "weekly"`. */
  dayOfWeek: integer("day_of_week"),
  /** Valores pra interpolar `{{key}}` do `template.variableSchema` — mesmo shape de bindings do Wizard (Fase 18). */
  variableBindings: text("variable_bindings", { mode: "json" }).$type<Record<string, string>>(),
  /** Fase 20 — "ligar o automático de verdade": pula a aprovação manual de custo (gate) quando true,
   * aprova sozinho respeitando `maxCostUsd` (rede de segurança extra, opcional) e o saldo de créditos
   * existente (mesma checagem do botão manual, `trySpend`). Default false — schedules antigos continuam
   * manuais. */
  autoApproveCost: integer("auto_approve_cost", { mode: "boolean" }).notNull().default(false),
  /** Só usado quando `autoApproveCost` é true — custo estimado acima disso cancela a execução em vez
   * de aprovar sozinho, mesmo com saldo suficiente. Null = sem teto além do saldo de créditos. */
  maxCostUsd: real("max_cost_usd"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }).notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
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
export const PUBLICATION_PLATFORMS = ["youtube"] as const;
export type PublicationPlatform = (typeof PUBLICATION_PLATFORMS)[number];

export const PUBLICATION_STATUSES = ["pending", "success", "error"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/**
 * "Publicação" (Fase 21) — resultado de 1 tentativa de publicar um job num destino externo
 * (só YouTube por ora, `PublishingProvider` §6). Um job pode ter mais de uma linha (retry após
 * erro) — o repository/rota sempre olha a mais recente por `jobId`.
 */
export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  platform: text("platform", { enum: PUBLICATION_PLATFORMS }).notNull(),
  status: text("status", { enum: PUBLICATION_STATUSES }).notNull().default("pending"),
  externalUrl: text("external_url"),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const wallet = sqliteTable("wallet", {
  id: text("id").primaryKey(),
  balanceUsd: real("balance_usd").notNull(),
  consumedUsd: real("consumed_usd").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
