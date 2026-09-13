import type { ScheduleFrequency } from "../persistence/schema.js";

export interface ScheduleTiming {
  frequency: ScheduleFrequency;
  /** "HH:mm", 24h. */
  timeOfDay: string;
  /** 0 (domingo) a 6 (sábado) — obrigatório e só usado quando `frequency === "weekly"`. */
  dayOfWeek?: number | null;
}

/**
 * Próxima execução >= `from`, no horário local do processo (decisão do usuário: sem timezone por
 * agendamento, Fase 19 é single-user/self-hosted). "daily" cai no próximo `timeOfDay` (hoje se ainda não
 * passou, senão amanhã). "weekly" cai no próximo `dayOfWeek` (hoje se for o dia e o horário ainda não
 * passou, senão o próximo desse dia da semana, 1-7 dias à frente).
 */
export function computeNextRunAt(timing: ScheduleTiming, from: Date): Date {
  const [hours, minutes] = timing.timeOfDay.split(":").map(Number);
  const next = new Date(from);
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  if (timing.frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }

  const targetDay = timing.dayOfWeek ?? 0;
  let daysUntilTarget = (targetDay - next.getDay() + 7) % 7;
  if (daysUntilTarget === 0 && next <= from) daysUntilTarget = 7;
  next.setDate(next.getDate() + daysUntilTarget);
  return next;
}
