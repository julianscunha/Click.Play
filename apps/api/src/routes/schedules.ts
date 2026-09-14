import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  computeNextRunAt,
  createSchedule,
  deleteSchedule,
  getTemplate,
  listSchedules,
  setScheduleEnabled,
  SCHEDULE_FREQUENCIES,
  type ClickPlayDb,
} from "@clickplay/providers";

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

const CreateScheduleBody = z.object({
  templateId: z.string().min(1, "templateId é obrigatório"),
  topic: z.string().trim().min(1, "topic é obrigatório"),
  frequency: z.enum(SCHEDULE_FREQUENCIES),
  timeOfDay: z.string().regex(TIME_OF_DAY, "timeOfDay precisa ser HH:mm"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  variableBindings: z.record(z.string(), z.string()).optional(),
  /** Fase 20 — "ligar o automático de verdade": pula a aprovação manual de custo quando true. */
  autoApproveCost: z.boolean().optional(),
  /** Teto por vídeo, só relevante com autoApproveCost — acima disso, cancela em vez de aprovar sozinho. */
  maxCostUsd: z.number().positive().optional(),
});

const UpdateScheduleBody = z.object({ enabled: z.boolean() });

export interface SchedulesRouteDeps {
  db: ClickPlayDb;
}

/** "Agendamento" (Fase 19) — dispara um template numa cadência fixa. Sem edição de frequência/horário
 * nesta rodada (decisão: apagar+recriar cobre o caso, evita form de editar duplicado do de criar). */
export function registerSchedulesRoutes(app: FastifyInstance, deps: SchedulesRouteDeps): void {
  app.get("/schedules", async () => listSchedules(deps.db));

  app.post("/schedules", async (req, reply) => {
    const parsed = CreateScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    if (parsed.data.frequency === "weekly" && parsed.data.dayOfWeek === undefined) {
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "dayOfWeek é obrigatório para frequência semanal" },
      });
    }
    const template = await getTemplate(deps.db, parsed.data.templateId);
    if (!template) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Template não encontrado" } });
    }

    const nextRunAt = computeNextRunAt(
      { frequency: parsed.data.frequency, timeOfDay: parsed.data.timeOfDay, dayOfWeek: parsed.data.dayOfWeek },
      new Date(),
    );
    const schedule = await createSchedule(deps.db, { ...parsed.data, nextRunAt });
    return reply.status(201).send(schedule);
  });

  app.patch<{ Params: { id: string } }>("/schedules/:id", async (req, reply) => {
    const parsed = UpdateScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(422)
        .send({ error: { code: "VALIDATION_ERROR", message: "Corpo inválido", details: parsed.error.flatten() } });
    }
    await setScheduleEnabled(deps.db, req.params.id, parsed.data.enabled);
    return reply.status(204).send();
  });

  app.delete<{ Params: { id: string } }>("/schedules/:id", async (req, reply) => {
    await deleteSchedule(deps.db, req.params.id);
    return reply.status(204).send();
  });
}
