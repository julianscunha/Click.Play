import type { PipelineCheckpoint } from "../pipeline/types.js";
import type { JobStatus } from "./schema.js";

/** Próximo estado do fluxo linear feliz (spec §23). */
const NEXT: Partial<Record<JobStatus, JobStatus>> = {
  QUEUED: "RESEARCHING",
  RESEARCHING: "PLANNING",
  PLANNING: "REVIEWING",
  REVIEWING: "AWAITING_COST_APPROVAL",
  AWAITING_COST_APPROVAL: "GENERATING",
  GENERATING: "RENDERING",
  RENDERING: "COMPLETED",
};

const TERMINAL = new Set<JobStatus>(["COMPLETED", "FAILED", "CANCELLED"]);

/**
 * Valida transição QUEUED→...→COMPLETED/FAILED/CANCELLED (spec §23). FAILED e
 * CANCELLED são alcançáveis de qualquer estado não-terminal — um erro pode
 * acontecer em qualquer estágio do pipeline.
 */
export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (to === "FAILED" || to === "CANCELLED") {
    if (TERMINAL.has(from)) {
      throw new Error(`Transição de job inválida: ${from} → ${to} (job já finalizado)`);
    }
    return;
  }

  if (NEXT[from] !== to) {
    throw new Error(`Transição de job inválida: ${from} → ${to}`);
  }
}

/**
 * Status de onde retomar um job FAILED, derivado do checkpoint (não é
 * transição normal do fluxo — reset administrativo, bypassa `assertTransition`).
 * Precisa "voltar" pro status que antecede o próximo `onStageStart` que vai
 * rodar de verdade, senão a transição normal do pipeline rejeita (ex: sem
 * isso, retomar com TTS já concluído tentaria GENERATING→GENERATING de novo).
 */
export function resumeStatusForCheckpoint(checkpoint: PipelineCheckpoint | null): JobStatus {
  if (!checkpoint?.research) return "QUEUED";
  if (!checkpoint.director) return "RESEARCHING";
  if (!checkpoint.tts) return "AWAITING_COST_APPROVAL";
  return "GENERATING";
}

/** Progresso derivado do status — não é input livre, evita divergência status/progresso. */
export const PROGRESS_BY_STATUS: Record<JobStatus, number> = {
  QUEUED: 0,
  RESEARCHING: 0.05,
  PLANNING: 0.15,
  REVIEWING: 0.3,
  AWAITING_COST_APPROVAL: 0.35,
  GENERATING: 0.4,
  RENDERING: 0.85,
  COMPLETED: 1,
  FAILED: 0,
  CANCELLED: 0,
};
