import { outputUrl, type JobView, type QcDecision } from "../api.js";
import { costLine } from "./ProgressView.js";

export interface ResultPlayerProps {
  job: JobView;
  onCreateAnother(): void;
}

const DECISION_STYLES: Record<QcDecision, string> = {
  PASS: "border-emerald-800 bg-emerald-950 text-emerald-400",
  WARNING: "border-amber-800 bg-amber-950 text-amber-400",
  BLOCK: "border-red-800 bg-red-950 text-red-400",
};

export function ResultPlayer({ job, onCreateAnother }: ResultPlayerProps) {
  if (!job.output) return null;
  const url = outputUrl(job.output);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
      {/* biome-ignore lint/a11y/useMediaCaption: legendas já são queimadas no vídeo pelo renderer */}
      <video controls autoPlay className="w-full rounded-md border border-neutral-800" src={url} />

      <div className="flex w-full gap-3">
        <a
          href={url}
          download
          className="flex-1 rounded-md bg-neutral-50 px-4 py-2 text-center font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Baixar vídeo
        </a>
        <button
          type="button"
          onClick={onCreateAnother}
          className="flex-1 rounded-md border border-neutral-600 px-4 py-2 font-medium text-neutral-200 hover:bg-neutral-800"
        >
          Criar outro vídeo
        </button>
      </div>

      {job.actualCost && (
        <div className="flex w-full flex-col gap-1 rounded-md border border-neutral-700 bg-neutral-900 p-4">
          <p className="text-sm font-medium text-neutral-100">Custo real</p>
          {costLine("LLM", job.actualCost.llm)}
          {costLine("Narração", job.actualCost.tts)}
          {costLine("Imagens", job.actualCost.image)}
          {costLine("Vídeo", job.actualCost.video)}
          {costLine("Música", job.actualCost.music)}
          <div className="mt-1 flex justify-between border-t border-neutral-700 pt-1 text-sm font-medium text-neutral-100">
            <span>Total</span>
            <span>{job.actualCost.total.status === "known" ? `US$ ${job.actualCost.total.usd.toFixed(3)}` : "—"}</span>
          </div>
        </div>
      )}

      {job.qcReport && (
        <div className="flex w-full flex-col gap-2 rounded-md border border-neutral-700 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-100">Controle de qualidade</p>
            <span
              className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${DECISION_STYLES[job.qcReport.decision]}`}
            >
              {job.qcReport.decision}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {job.qcReport.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-xs text-neutral-400">
                <span className={check.passed ? "text-emerald-400" : "text-red-400"}>{check.passed ? "✓" : "✗"}</span>
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {job.resultSummary && (
        <div className="flex w-full justify-between text-xs text-neutral-500">
          <span>{job.resultSummary.imageCount} imagem(ns)</span>
          <span>{job.resultSummary.videoClipCount} clipe(s) de vídeo</span>
          <span>{job.resultSummary.audioSeconds.toFixed(1)}s de narração</span>
        </div>
      )}
    </div>
  );
}
