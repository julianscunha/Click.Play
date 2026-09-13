import { useState } from "react";
import { outputUrl, saveTemplate, type JobView, type QcDecision, type TemplateVariable } from "../api.js";
import { costLine } from "./ProgressView.js";

export interface ResultPlayerProps {
  job: JobView;
  onCreateAnother(): void;
}

/**
 * Fase 18: parseia "CHAVE=Label, OUTRA=Outro label" em `TemplateVariable[]` — formato texto livre em vez
 * de N pares de campos, decisão de manter o card de salvar template com 1 input a mais, não uma sub-UI de lista.
 * Entradas sem "=" ou com chave vazia são ignoradas (usuário ainda digitando).
 */
function parseVariableSchema(raw: string): TemplateVariable[] {
  return raw
    .split(",")
    .map((part) => {
      const [key, ...rest] = part.split("=");
      return { key: key?.trim() ?? "", label: rest.join("=").trim() };
    })
    .filter((v) => v.key.length > 0 && v.label.length > 0);
}

function SaveAsTemplate({ productionId }: { productionId: string }) {
  const [name, setName] = useState("");
  const [variablesRaw, setVariablesRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const variableSchema = parseVariableSchema(variablesRaw);
      const template = await saveTemplate(name.trim(), productionId, variableSchema.length > 0 ? variableSchema : undefined);
      setSaved(template.version > 1 ? `Template "${template.name}" atualizado (v${template.version}).` : `Template "${template.name}" salvo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-sm font-medium text-neutral-100">Salvar como template</p>
      <p className="text-xs text-neutral-500">
        Reaproveita todas as decisões desta produção (arquétipo, visual, música, narração, legendas...) num template —
        mesmo nome sobrescreve, mesmo se o template existente for de outro projeto.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(null);
          }}
          placeholder="Nome do template"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-md border border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <input
          value={variablesRaw}
          onChange={(e) => {
            setVariablesRaw(e.target.value);
            setSaved(null);
          }}
          placeholder="Variáveis (opcional): PERSONAGEM=Nome do personagem, TEMA=Tema da história"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">
          Use <code>{"{{CHAVE}}"}</code> no campo "Briefing" desta produção — ao reaproveitar o template, quem for
          criar um vídeo novo preenche um valor por variável declarada aqui.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-xs text-emerald-400">{saved}</p>}
    </div>
  );
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

      <SaveAsTemplate productionId={job.productionId} />

      <div className="flex w-full flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
        <p className="text-sm font-medium text-neutral-100">Publicação</p>
        <p className="text-xs text-neutral-500">
          Publicação direta (YouTube, TikTok, Instagram) chega em breve. Por enquanto, baixe o vídeo e publique
          manualmente.
        </p>
      </div>

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
