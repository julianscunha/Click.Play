import * as path from "node:path";
import type { QualityTier } from "@clickplay/domain";
import {
  computeNextRunAt,
  type CostBreakdown,
  type createCostApprovalGate,
  createJob,
  createProduction,
  getTemplate,
  type LLMProvider,
  listDueSchedules,
  markScheduleRun,
  resolveGenerativeVariables,
  resolveScheduleConfig,
  setScheduleEnabled,
  startJob,
  trySpend,
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
  /** Fase 20 — só usado pra resolver variável `kind: "generative"`; não é o LLM do roteiro do job em si. */
  buildLLM(): LLMProvider;
  runsDir: string;
  gate: ReturnType<typeof createCostApprovalGate>;
  onLog?(jobId: string, message: string): void;
  onError?(scheduleId: string, err: unknown): void;
}

/**
 * Fase 20 — política de aprovação automática quando `schedule.autoApproveCost` está ligado: custo
 * desconhecido nunca aprova sozinho (sem humano pra decidir, diferente do botão manual que deixa passar);
 * `maxCostUsd` (opcional) é um teto extra só pras execuções automáticas, acima do saldo de créditos
 * normal; `useOwnProviders` não debita (mesma regra do botão manual, `POST /jobs/:id/approve-cost`).
 */
async function autoApproveCost(
  db: ClickPlayDb,
  estimate: CostBreakdown,
  maxCostUsd: number | null,
  useOwnProviders: boolean | undefined,
): Promise<boolean> {
  if (estimate.total.status !== "known") return false;
  if (maxCostUsd != null && estimate.total.usd > maxCostUsd) return false;
  if (useOwnProviders) return true;
  return trySpend(db, estimate.total.usd);
}

/**
 * Dispara todo agendamento vencido (Fase 19): cria `production`+`job` a partir do template resolvido
 * (Fase 18, `direction` + Fase 20, variáveis `generative`) e chama `startJob` — mesmo caminho de
 * `POST /jobs`, sem pipeline paralelo (decisão #6 do roadmap). Aprovação de custo é manual por padrão;
 * `schedule.autoApproveCost` (Fase 20 — "ligar o automático de verdade") pula o gate e aprova sozinho
 * via `autoApproveCost()` acima.
 */
export async function runDueSchedules(deps: SchedulerDeps, now: Date = new Date()): Promise<void> {
  const due = await listDueSchedules(deps.db, now);
  for (const schedule of due) {
    try {
      const template = await getTemplate(deps.db, schedule.templateId);
      if (!template) {
        // Template apagado depois do agendamento criado — sem tela de gerenciar templates pra evitar
        // isso na origem (Fase 17). Desabilita o agendamento (em vez de deixar "preso" recalculando
        // pra sempre sem produzir nada) e reporta via onError — usuário vê o motivo em Agendamentos.
        await setScheduleEnabled(deps.db, schedule.id, false);
        deps.onError?.(schedule.id, new Error(`Template "${schedule.templateId}" não existe mais — agendamento desabilitado`));
        continue;
      }

      const bindings = await resolveGenerativeVariables(deps.buildLLM(), template.variableSchema, schedule.variableBindings);
      const config = resolveScheduleConfig(template.config, bindings);
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
          approveCost: schedule.autoApproveCost
            ? (estimate) => autoApproveCost(deps.db, estimate, schedule.maxCostUsd, config.useOwnProviders)
            : () => deps.gate.waitForApproval(job.id),
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
