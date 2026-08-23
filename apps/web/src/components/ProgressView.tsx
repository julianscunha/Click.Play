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

/** Erros de provider (LLM/TTS) vêm crus — stack técnica, JSON de validação, URLs de doc.
 * Traduz os padrões mais comuns pra mensagem acionável; resto cai no fallback truncado. */
function friendlyError(raw: string): { title: string; hint?: string } {
  if (/quota|rate.?limit|429/i.test(raw)) {
    return {
      title: "Limite de uso do provedor de IA atingido (rate limit / quota).",
      hint: "Espere alguns segundos e tente de novo, ou troque a chave/modelo em Configurações.",
    };
  }
  if (/no output generated/i.test(raw)) {
    return {
      title: "O modelo de IA não retornou resposta.",
      hint: "Tente de novo — se persistir, troque o modelo em Configurações (modelos \"preview\"/experimentais falham mais).",
    };
  }
  if (/premature close|econnreset|fetch failed|network/i.test(raw)) {
    return {
      title: "Falha de conexão com um provedor externo.",
      hint: "Geralmente é falha pontual de rede — tente criar o vídeo de novo.",
    };
  }
  return { title: raw.length > 200 ? `${raw.slice(0, 200)}…` : raw };
}

export function costLine(label: string, amount: CostBreakdown[keyof CostBreakdown]) {
  return (
    <div key={label} className="flex justify-between text-sm text-neutral-300">
      <span>{label}</span>
      <span>{amount.status === "known" ? `US$ ${amount.usd.toFixed(3)}` : "indisponível"}</span>
    </div>
  );
}

export interface ProgressViewProps {
  job: JobView;
  onApprove(approved: boolean): Promise<boolean>;
  approving: boolean;
  approveError: string | null;
  onRetry(): void;
  retrying: boolean;
}

export function ProgressView({ job, onApprove, approving, approveError, onRetry, retrying }: ProgressViewProps) {
  const [decided, setDecided] = useState(false);
  const percent = Math.round(job.progress * 100);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-neutral-300">
          <span>{STAGE_LABELS[job.stage] ?? job.stage}</span>
          <span>{percent}%</span>
        </div>
        {job.stageDetail && <p className="text-xs text-neutral-500">{job.stageDetail}</p>}
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
              onClick={async () => {
                const ok = await onApprove(true);
                if (ok) setDecided(true);
              }}
              className="flex-1 rounded-md bg-neutral-50 px-3 py-2 font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={async () => {
                const ok = await onApprove(false);
                if (ok) setDecided(true);
              }}
              className="flex-1 rounded-md border border-neutral-600 px-3 py-2 font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
          {approveError && (
            <p role="alert" className="text-sm text-red-400">
              {approveError}
            </p>
          )}
        </div>
      )}

      {job.status === "FAILED" &&
        (() => {
          const raw = job.error ?? "Falha desconhecida.";
          const { title, hint } = friendlyError(raw);
          return (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              <p className="font-medium">{title}</p>
              {hint && <p className="text-red-300/80">{hint}</p>}
              {title !== raw && (
                <details className="text-xs text-red-400/70">
                  <summary className="cursor-pointer select-none">ver detalhes técnicos</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">{raw}</pre>
                </details>
              )}
              <button
                type="button"
                disabled={retrying}
                onClick={onRetry}
                className="mt-1 self-start rounded-md bg-red-100 px-3 py-1.5 font-medium text-red-950 hover:bg-red-200 disabled:opacity-50"
              >
                {retrying ? "Tentando de novo…" : "Tentar de novo"}
              </button>
            </div>
          );
        })()}

      {job.status === "CANCELLED" && (
        <div role="status" className="rounded-md border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-300">
          {job.error ?? "Job cancelado."}
        </div>
      )}
    </div>
  );
}
