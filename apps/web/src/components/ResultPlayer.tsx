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
    <div className="flex w-full flex-col gap-2 rounded-md border border-border-subtle bg-surface-1 p-4">
      <p className="text-sm font-medium text-fg-primary">Salvar como template</p>
      <p className="text-xs text-fg-tertiary">
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
          className="flex-1 rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-md border border-border-default px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-2 disabled:opacity-50"
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
          className="rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
        />
        <p className="text-xs text-fg-tertiary">
          Use <code>{"{{CHAVE}}"}</code> no campo "Briefing" desta produção — ao reaproveitar o template, quem for
          criar um vídeo novo preenche um valor por variável declarada aqui.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-error">
          {error}
        </p>
      )}
      {saved && <p className="text-xs text-status-success">{saved}</p>}
    </div>
  );
}

const DECISION_STYLES: Record<QcDecision, string> = {
  PASS: "border-status-success-border bg-status-success-bg text-status-success",
  WARNING: "border-status-warning-border bg-status-warning-bg text-status-warning",
  BLOCK: "border-status-error-border bg-status-error-bg text-status-error",
};

export function ResultPlayer({ job, onCreateAnother }: ResultPlayerProps) {
  if (!job.output) return null;
  const url = outputUrl(job.output);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
      {/* biome-ignore lint/a11y/useMediaCaption: legendas já são queimadas no vídeo pelo renderer */}
      <video controls autoPlay className="w-full rounded-md border border-border-subtle" src={url} />

      <div className="flex w-full gap-3">
        <a
          href={url}
          download
          className="flex-1 rounded-md bg-fg-primary px-4 py-2 text-center font-medium text-surface-0 hover:opacity-90"
        >
          Baixar vídeo
        </a>
        <button
          type="button"
          onClick={onCreateAnother}
          className="flex-1 rounded-md border border-border-default px-4 py-2 font-medium text-fg-primary hover:bg-surface-2"
        >
          Criar outro vídeo
        </button>
      </div>

      {job.actualCost && (
        <div className="flex w-full flex-col gap-1 rounded-md border border-border-default bg-surface-1 p-4">
          <p className="text-sm font-medium text-fg-primary">Custo real</p>
          {costLine("LLM", job.actualCost.llm)}
          {costLine("Narração", job.actualCost.tts)}
          {costLine("Imagens", job.actualCost.image)}
          {costLine("Vídeo", job.actualCost.video)}
          {costLine("Música", job.actualCost.music)}
          <div className="mt-1 flex justify-between border-t border-border-default pt-1 text-sm font-medium text-fg-primary">
            <span>Total</span>
            <span>{job.actualCost.total.status === "known" ? `US$ ${job.actualCost.total.usd.toFixed(3)}` : "—"}</span>
          </div>
        </div>
      )}

      {job.qcReport && (
        <div className="flex w-full flex-col gap-2 rounded-md border border-border-default bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-fg-primary">Controle de qualidade</p>
            <span
              className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${DECISION_STYLES[job.qcReport.decision]}`}
            >
              {job.qcReport.decision}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {job.qcReport.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-xs text-fg-secondary">
                <span className={check.passed ? "text-status-success" : "text-status-error"}>{check.passed ? "✓" : "✗"}</span>
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SaveAsTemplate productionId={job.productionId} />

      <div className="flex w-full flex-col gap-1 rounded-md border border-border-subtle bg-surface-1 p-4">
        <p className="text-sm font-medium text-fg-primary">Publicação</p>
        <p className="text-xs text-fg-tertiary">
          Publicação direta (YouTube, TikTok, Instagram) chega em breve. Por enquanto, baixe o vídeo e publique
          manualmente.
        </p>
      </div>

      {job.resultSummary && (
        <div className="flex w-full justify-between text-xs text-fg-tertiary">
          <span>{job.resultSummary.imageCount} imagem(ns)</span>
          <span>{job.resultSummary.videoClipCount} clipe(s) de vídeo</span>
          <span>{job.resultSummary.audioSeconds.toFixed(1)}s de narração</span>
        </div>
      )}
    </div>
  );
}
