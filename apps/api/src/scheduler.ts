import * as path from "node:path";
import type { QualityTier } from "@clickplay/domain";
import {
  computeNextRunAt,
  type createCostApprovalGate,
  createJob,
  createProduction,
  getTemplate,
  listDueSchedules,
  markScheduleRun,
  resolveScheduleConfig,
  startJob,
  type ClickPlayDb,
  type CostEstimateOptions,
  type JobRunnerDeps,
  type ScheduleTiming,
} from "@clickplay/providers";

export interface SchedulerDeps {
  db: ClickPlayDb;
  buildJobRunnerDeps(
    tier?: QualityTier,
    language?: string,
    useOwnProviders?: boolean,
    voiceGender?: "female" | "male",
  ): JobRunnerDeps;
  buildCostOptions(): CostEstimateOptions;
  runsDir: string;
  gate: ReturnType<typeof createCostApprovalGate>;
  onLog?(jobId: string, message: string): void;
  onError?(scheduleId: string, err: unknown): void;
}

/**
 * Dispara todo agendamento vencido (Fase 19): cria `production`+`job` a partir do template resolvido
 * (Fase 18, só `direction`) e chama `startJob` — mesmo caminho de `POST /jobs`, sem pipeline paralelo
 * (decisão #6 do roadmap). Aprovação de custo continua manual (gate), agendamento só automatiza a
 * *criação* do job, não pula a aprovação — "ligar o automático de verdade" é decisão de produto da
 * Fase 20, não desta.
 */
export async function runDueSchedules(deps: SchedulerDeps, now: Date = new Date()): Promise<void> {
  const due = await listDueSchedules(deps.db, now);
  for (const schedule of due) {
    try {
      const template = await getTemplate(deps.db, schedule.templateId);
      if (!template) {
        // Template apagado depois do agendamento criado — sem tela de gerenciar templates pra evitar
        // isso na origem (Fase 17). Ponytail: só pula e recalcula a próxima execução, sem alertar o
        // usuário — agendamento fica "preso" rodando pra sempre sem produzir nada; upgrade se virar
        // reclamação real: desabilitar o agendamento automaticamente quando o template sumir.
        await markScheduleRun(deps.db, schedule.id, { ranAt: now, nextRunAt: nextRunAtFor(schedule, now) });
        continue;
      }

      const config = resolveScheduleConfig(template.config, schedule.variableBindings);
      const production = await createProduction(deps.db, {
        topic: schedule.topic,
        contentProjectId: template.contentProjectId ?? undefined,
        config: { ...config, cost: deps.buildCostOptions() },
      });
      const runDir = path.join(deps.runsDir, production.id);
      const job = await createJob(deps.db, { productionId: production.id, runDir });

      startJob(
        deps.db,
        job.id,
        deps.buildJobRunnerDeps(config.qualityTier, config.language, config.useOwnProviders, config.voiceGender),
        {
          approveCost: () => deps.gate.waitForApproval(job.id),
          onLog: (message) => deps.onLog?.(job.id, message),
        },
      );

      await markScheduleRun(deps.db, schedule.id, { ranAt: now, nextRunAt: nextRunAtFor(schedule, now) });
    } catch (err) {
      deps.onError?.(schedule.id, err);
    }
  }
}

function nextRunAtFor(schedule: ScheduleTiming, from: Date) {
  return computeNextRunAt(schedule, from);
}
