import { useState } from "react";
import type { CostBreakdown, JobView } from "../api.js";

const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  research: "Pesquisando o tema",
  director: "Roteirizando",
  director_review: "Revisando roteiro",
  cost_approval: "Aguardando aprovação de custo",
  tts_and_visuals: "Gerando narração e visuais",
  render: "Renderizando vídeo",
  done: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function costLine(label: string, amount: CostBreakdown[keyof CostBreakdown]) {
  return (
    <div key={label} className="flex justify-between text-sm text-neutral-300">
      <span>{label}</span>
      <span>{amount.status === "known" ? `US$ ${amount.usd.toFixed(3)}` : "indisponível"}</span>
    </div>
  );
}

export interface ProgressViewProps {
  job: JobView;
  onApprove(approved: boolean): void;
  approving: boolean;
}

export function ProgressView({ job, onApprove, approving }: ProgressViewProps) {
  const [decided, setDecided] = useState(false);
  const percent = Math.round(job.progress * 100);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-neutral-300">
          <span>{STAGE_LABELS[job.stage] ?? job.stage}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-50 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {job.status === "AWAITING_COST_APPROVAL" && job.estimatedCost && !decided && (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-700 bg-neutral-900 p-4">
          <p className="text-sm font-medium text-neutral-100">Custo estimado</p>
          <div className="flex flex-col gap-1">
            {costLine("LLM", job.estimatedCost.llm)}
            {costLine("Narração", job.estimatedCost.tts)}
            {costLine("Imagens", job.estimatedCost.image)}
            {costLine("Vídeo", job.estimatedCost.video)}
            {costLine("Música", job.estimatedCost.music)}
            <div className="mt-1 flex justify-between border-t border-neutral-700 pt-1 text-sm font-medium text-neutral-100">
              <span>Total</span>
              <span>
                {job.estimatedCost.total.status === "known" ? `US$ ${job.estimatedCost.total.usd.toFixed(3)}` : "—"}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={approving}
              onClick={() => {
                setDecided(true);
                onApprove(true);
              }}
              className="flex-1 rounded-md bg-neutral-50 px-3 py-2 font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={() => {
                setDecided(true);
                onApprove(false);
              }}
              className="flex-1 rounded-md border border-neutral-600 px-3 py-2 font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
        </div>
      )}

      {job.status === "FAILED" && (
        <div role="alert" className="rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {job.error ?? "Falha desconhecida."}
        </div>
      )}

      {job.status === "CANCELLED" && (
        <div role="status" className="rounded-md border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-300">
          {job.error ?? "Job cancelado."}
        </div>
      )}
    </div>
  );
}
