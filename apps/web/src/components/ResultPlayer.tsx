import { useEffect, useState } from "react";
import {
  downloadUrl,
  getPublication,
  outputUrl,
  publishJob,
  saveTemplate,
  type JobView,
  type Publication,
  type QcDecision,
  type TemplateVariable,
} from "../api.js";
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
function parseVariableSchema(raw: string, kind: "literal" | "generative"): TemplateVariable[] {
  return raw
    .split(",")
    .map((part) => {
      const [key, ...rest] = part.split("=");
      return { key: key?.trim() ?? "", label: rest.join("=").trim(), kind };
    })
    .filter((v) => v.key.length > 0 && v.label.length > 0);
}

function SaveAsTemplate({ productionId }: { productionId: string }) {
  const [name, setName] = useState("");
  const [variablesRaw, setVariablesRaw] = useState("");
  const [generativeVariablesRaw, setGenerativeVariablesRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const variableSchema = [
        ...parseVariableSchema(variablesRaw, "literal"),
        ...parseVariableSchema(generativeVariablesRaw, "generative"),
      ];
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
      <div className="flex flex-col gap-1">
        <input
          value={generativeVariablesRaw}
          onChange={(e) => {
            setGenerativeVariablesRaw(e.target.value);
            setSaved(null);
          }}
          placeholder="Variáveis geradas por IA (opcional): PERSONAGEM=Invente um nome de personagem curioso"
          className="rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
        />
        <p className="text-xs text-fg-tertiary">
          Diferente das de cima: em vez de um humano preencher o valor, o texto aqui é a instrução — o LLM gera o
          valor sozinho a cada disparo de um agendamento automático (Agendamentos → "aprovar custo automaticamente").
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

/**
 * Fase 21 — publicação manual (decisão do usuário: sem auto-publicar quando o QC passa, o
 * usuário revisa o vídeo e clica). Só aparece quando `job.output` existe (job COMPLETED),
 * mesma condição já usada pro resto do ResultPlayer.
 */
function PublishToYoutube({ jobId }: { jobId: string }) {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState<"private" | "unlisted" | "public">("private");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublication(jobId)
      .then(setPublication)
      .catch(() => setPublication(null))
      .finally(() => setLoaded(true));
  }, [jobId]);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const result = await publishJob(jobId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        privacyStatus,
      });
      setPublication(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-border-subtle bg-surface-1 p-4">
      <p className="text-sm font-medium text-fg-primary">Publicação</p>

      {publication?.status === "success" && publication.externalUrl ? (
        <p className="text-xs text-status-success">
          Publicado no YouTube:{" "}
          <a href={publication.externalUrl} target="_blank" rel="noreferrer" className="underline">
            {publication.externalUrl}
          </a>
        </p>
      ) : (
        <>
          <p className="text-xs text-fg-tertiary">
            Publica direto no YouTube (conta conectada em Configurações → Publicação). TikTok/Instagram chegam depois
            — por enquanto, baixe o vídeo e publique manualmente nessas plataformas.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (padrão: tema da produção)"
            className="rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            rows={2}
            className="rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value as typeof privacyStatus)}
              className="rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg-primary focus:border-border-strong focus:outline-none"
            >
              <option value="private">Privado</option>
              <option value="unlisted">Não listado</option>
              <option value="public">Público</option>
            </select>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 rounded-md border border-border-default px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-2 disabled:opacity-50"
            >
              {publishing ? "Publicando..." : "Publicar no YouTube"}
            </button>
          </div>
          {(error || publication?.status === "error") && (
            <p role="alert" className="text-xs text-status-error">
              {error ?? publication?.error}
            </p>
          )}
        </>
      )}
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
          href={downloadUrl(job.output)}
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

      <PublishToYoutube jobId={job.id} />

      {job.resultSummary && (
        <div className="flex w-full justify-between text-xs text-fg-tertiary">
          <span>{job.resultSummary.imageCount} imagem(ns)</span>
          <span>{job.resultSummary.videoClipCount} clipe(s) de vídeo</span>
          <span>{job.resultSummary.audioSeconds.toFixed(1)}s de narração</span>
        </div>
      )}
      {job.resultSummary?.narrationTimingEstimated && (
        <p className="text-xs text-status-warning">
          Legenda com timing estimado (a voz caiu no provider de fallback) — pode haver leve dessincronia.
        </p>
      )}
    </div>
  );
}
