import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CostBreakdown } from "../cost/index.js";
import type { PipelineCheckpoint } from "../pipeline/types.js";
import type { QcReport } from "../qc/types.js";
import type { ClickPlayDb } from "./client.js";
import { PROGRESS_BY_STATUS, resumeStatusForCheckpoint } from "./job-state-machine.js";
import { contentProjects, jobs, type JobStatus, productions, templates, wallet } from "./schema.js";
import {
  type ContentProject,
  contentProjectFromRow,
  type Job,
  jobFromRow,
  type Production,
  type ProductionConfig,
  productionFromRow,
  type ResultSummary,
  type Template,
  templateFromRow,
  type TemplateVariable,
} from "./types.js";

export async function createProduction(
  db: ClickPlayDb,
  input: { topic: string; config: ProductionConfig; contentProjectId?: string },
): Promise<Production> {
  const now = new Date();
  const row = {
    id: randomUUID(),
    topic: input.topic,
    config: input.config,
    contentProjectId: input.contentProjectId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(productions).values(row);
  return productionFromRow(row as never);
}

export async function getProduction(db: ClickPlayDb, id: string): Promise<Production | null> {
  const row = await db.select().from(productions).where(eq(productions.id, id)).get();
  return row ? productionFromRow(row) : null;
}

export async function createContentProject(db: ClickPlayDb, input: { name: string }): Promise<ContentProject> {
  const now = new Date();
  const row = { id: randomUUID(), name: input.name, createdAt: now, updatedAt: now };
  await db.insert(contentProjects).values(row);
  return contentProjectFromRow(row as never);
}

export async function listContentProjects(db: ClickPlayDb): Promise<ContentProject[]> {
  const rows = await db.select().from(contentProjects).all();
  return rows.map(contentProjectFromRow);
}

export async function getContentProject(db: ClickPlayDb, id: string): Promise<ContentProject | null> {
  const row = await db.select().from(contentProjects).where(eq(contentProjects.id, id)).get();
  return row ? contentProjectFromRow(row) : null;
}

export async function listProductionsByContentProject(db: ClickPlayDb, contentProjectId: string): Promise<Production[]> {
  const rows = await db.select().from(productions).where(eq(productions.contentProjectId, contentProjectId)).all();
  return rows.map(productionFromRow);
}

/**
 * Salva/atualiza um Template a partir do config de uma Production (Fase 17).
 * Mesmo nome sobrescreve (decisão do usuário) — unicidade por nome é checada
 * aqui, não via constraint de banco, pra dar mensagem/comportamento previsível
 * ao caller em vez de estourar erro de SQL.
 *
 * Unicidade é GLOBAL por nome, não escopada por `contentProjectId` — decisão
 * literal do usuário ("se for o mesmo nome, sobrescreve"), sem exceção pra
 * projetos diferentes. Efeito real: um template "Padrão" salvo a partir de
 * uma produção do Projeto B sobrescreve o "Padrão" do Projeto A (config e
 * contentProjectId trocados, sem aviso a quem criou o do Projeto A) — achado
 * em code review, aceito como comportamento válido, não bug (ver teste
 * "overwrites across content projects" abaixo).
 *
 * ponytail: select-then-update sem transação — 2 requisições concorrentes
 * salvando o MESMO nome ao mesmo tempo podem ambas ler "não existe" e ambas
 * inserirem (duplicata) ou pisarem a version uma da outra. Risco real mas
 * baixo (single-user, sem fila de requisições concorrentes no fluxo hoje);
 * upgrade se um dia importar: transação SQLite ou lock otimista por nome.
 */
export async function upsertTemplate(
  db: ClickPlayDb,
  input: {
    name: string;
    config: ProductionConfig;
    contentProjectId: string | null;
    sourceProductionId: string;
    variableSchema?: TemplateVariable[];
  },
): Promise<Template> {
  const existing = await db.select().from(templates).where(eq(templates.name, input.name)).get();
  const now = new Date();
  const variableSchema = input.variableSchema ?? [];

  if (existing) {
    const row = {
      ...existing,
      config: input.config,
      contentProjectId: input.contentProjectId,
      sourceProductionId: input.sourceProductionId,
      variableSchema,
      version: existing.version + 1,
      updatedAt: now,
    };
    await db.update(templates).set(row).where(eq(templates.id, existing.id));
    return templateFromRow(row as never);
  }

  const row = {
    id: randomUUID(),
    contentProjectId: input.contentProjectId,
    name: input.name,
    version: 1,
    config: input.config,
    sourceProductionId: input.sourceProductionId,
    variableSchema,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(templates).values(row);
  return templateFromRow(row as never);
}

export async function listTemplates(db: ClickPlayDb): Promise<Template[]> {
  const rows = await db.select().from(templates).all();
  return rows.map(templateFromRow);
}

export async function getTemplate(db: ClickPlayDb, id: string): Promise<Template | null> {
  const row = await db.select().from(templates).where(eq(templates.id, id)).get();
  return row ? templateFromRow(row) : null;
}

export async function createJob(db: ClickPlayDb, input: { productionId: string; runDir: string }): Promise<Job> {
  const now = new Date();
  const row = {
    id: randomUUID(),
    productionId: input.productionId,
    status: "QUEUED" as JobStatus,
    progress: 0,
    runDir: input.runDir,
    outputPath: null,
    estimatedCost: null,
    actualCost: null,
    qcReport: null,
    checkpoint: null,
    stageDetail: null,
    resultSummary: null,
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

export async function listJobsByProduction(db: ClickPlayDb, productionId: string): Promise<Job[]> {
  const rows = await db.select().from(jobs).where(eq(jobs.productionId, productionId)).all();
  return rows.map(jobFromRow);
}

/**
 * Progresso é sempre derivado do status (PROGRESS_BY_STATUS) — não aceita
 * valor livre. FAILED/CANCELLED preservam o progresso do último estágio
 * concluído em vez de zerar (útil pra saber onde o job parou).
 */
export async function updateJobStatus(db: ClickPlayDb, id: string, status: JobStatus): Promise<void> {
  // stageDetail zera a cada troca de estágio — texto da sub-etapa anterior não deve vazar pro próximo.
  const set: { status: JobStatus; updatedAt: Date; progress?: number; stageDetail: null } = {
    status,
    updatedAt: new Date(),
    stageDetail: null,
  };
  if (status !== "FAILED" && status !== "CANCELLED") set.progress = PROGRESS_BY_STATUS[status];
  await db.update(jobs).set(set).where(eq(jobs.id, id));
}

/**
 * Progresso granular dentro do estágio GENERATING (§11A observabilidade) —
 * único ponto que aceita progress/stageDetail livres, fora da derivação por
 * status. Quem chama garante que só é usado durante GENERATING (job-runner.ts).
 */
export async function setJobProgress(db: ClickPlayDb, id: string, progress: number, stageDetail?: string): Promise<void> {
  await db.update(jobs).set({ progress, stageDetail: stageDetail ?? null, updatedAt: new Date() }).where(eq(jobs.id, id));
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

export async function setJobResultSummary(db: ClickPlayDb, id: string, resultSummary: ResultSummary): Promise<void> {
  await db.update(jobs).set({ resultSummary, updatedAt: new Date() }).where(eq(jobs.id, id));
}

const WALLET_ID = "default";

export interface Wallet {
  balanceUsd: number;
  consumedUsd: number;
}

export async function getWallet(db: ClickPlayDb): Promise<Wallet> {
  const row = await db.select().from(wallet).where(eq(wallet.id, WALLET_ID)).get();
  return row ? { balanceUsd: row.balanceUsd, consumedUsd: row.consumedUsd } : { balanceUsd: 0, consumedUsd: 0 };
}

/** Reabastecimento manual (tela Configurações — sem billing real ainda, ver §11 decisão de Fase 22). Define o saldo exato, não soma. */
export async function setWalletBalance(db: ClickPlayDb, balanceUsd: number): Promise<void> {
  await db.update(wallet).set({ balanceUsd, updatedAt: new Date() }).where(eq(wallet.id, WALLET_ID));
}

/** Debita se houver saldo suficiente (1 crédito = US$1); `false` sem debitar nada se insuficiente. Chamado na aprovação do custo estimado, não no fim real do job. */
export async function trySpend(db: ClickPlayDb, amountUsd: number): Promise<boolean> {
  const current = await getWallet(db);
  if (current.balanceUsd < amountUsd) return false;
  await db
    .update(wallet)
    .set({ balanceUsd: current.balanceUsd - amountUsd, consumedUsd: current.consumedUsd + amountUsd, updatedAt: new Date() })
    .where(eq(wallet.id, WALLET_ID));
  return true;
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
  await db
    .update(jobs)
    .set({ status, progress, stageDetail: null, error: null, updatedAt: new Date() })
    .where(eq(jobs.id, id));
  return { ...job, status, progress, stageDetail: null, error: null };
}
