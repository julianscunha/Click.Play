import { useState } from "react";
import type { CreateJobInput, FormConfig } from "../../api.js";

function formatLabel(id: string): string {
  return id.replace(/_/g, " ");
}

const STEPS = [
  { key: "briefing", label: "Briefing" },
  { key: "roteiro", label: "Roteiro" },
  { key: "visual", label: "Visual" },
  { key: "legendas", label: "Legendas" },
  { key: "revisao", label: "Revisão/Custo" },
] as const;

const CHUNK_SIZE_LEVELS = [
  { level: "poucas", label: "Poucas por vez", value: 2 },
  { level: "medias", label: "Médias", value: 4 },
  { level: "muitas", label: "Muitas por vez", value: 6 },
] as const;

interface FormState {
  topic: string;
  direction: string;
  archetype: string;
  pacing: string;
  language: "pt-BR" | "en-US";
  targetDurationSeconds: string;
  videoMode: "motion_graphics_only" | "ai_video_only" | "hybrid";
  captionStyle: string;
  aspectRatio: "vertical" | "horizontal" | "square";
  qualityTier: "draft" | "standard" | "high";
  captionChunkLevel: (typeof CHUNK_SIZE_LEVELS)[number]["level"];
  showTextOverlays: boolean;
}

const INITIAL_STATE: FormState = {
  topic: "",
  direction: "",
  archetype: "",
  pacing: "",
  language: "pt-BR",
  targetDurationSeconds: "",
  videoMode: "hybrid",
  captionStyle: "",
  aspectRatio: "vertical",
  qualityTier: "standard",
  captionChunkLevel: "medias",
  showTextOverlays: true,
};

const fieldClass =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none";
const labelClass = "text-sm font-medium text-neutral-200";

function Chip({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-orange-500 bg-orange-500/15 text-orange-400"
          : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
      }`}
    >
      {children}
    </button>
  );
}

function StepIcon({ done, active, index }: { done: boolean; active: boolean; index: number }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs";
  if (done) return <span className={`${base} border-emerald-600 bg-emerald-950 text-emerald-400`}>✓</span>;
  if (active) return <span className={`${base} border-orange-500 bg-orange-500 text-neutral-950`}>{index + 1}</span>;
  return <span className={`${base} border-neutral-700 text-neutral-500`}>{index + 1}</span>;
}

export interface WizardProps {
  config: FormConfig;
  onSubmit(input: CreateJobInput): void;
  submitting: boolean;
}

export function Wizard({ config, onSubmit, submitting }: WizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  const step = STEPS[stepIndex]!;
  const canLeaveBriefing = form.topic.trim().length > 0;
  const canGoNext = step.key !== "briefing" || canLeaveBriefing;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function goToStep(index: number) {
    if (index > stepIndex && !canGoNext) return;
    setStepIndex(index);
  }

  function handleSubmit() {
    if (!canLeaveBriefing || submitting) return;
    const targetDurationSeconds = Number(form.targetDurationSeconds);
    onSubmit({
      topic: form.topic.trim(),
      direction: form.direction.trim() || undefined,
      archetype: form.archetype || undefined,
      pacing: form.pacing || undefined,
      language: form.language,
      targetDurationSeconds:
        form.targetDurationSeconds.trim() && Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0
          ? targetDurationSeconds
          : undefined,
      videoMode: form.videoMode,
      captionStyle: form.captionStyle || undefined,
      aspectRatio: form.aspectRatio,
      qualityTier: form.qualityTier,
      captionChunkSize: CHUNK_SIZE_LEVELS.find((l) => l.level === form.captionChunkLevel)!.value,
      showTextOverlays: form.showTextOverlays,
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl gap-6">
      <nav className={`flex shrink-0 flex-col gap-1 border-r border-neutral-800 pr-4 ${collapsed ? "w-10" : "w-40"}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir etapas" : "Recolher etapas"}
          className="mb-2 self-end text-neutral-500 hover:text-neutral-300"
        >
          {collapsed ? "»" : "«"}
        </button>
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goToStep(i)}
            disabled={i > stepIndex && !canGoNext}
            title={s.label}
            className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
              i === stepIndex ? "bg-neutral-900 font-semibold text-neutral-50" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <StepIcon done={i < stepIndex} active={i === stepIndex} index={i} />
            {!collapsed && <span className="truncate">{s.label}</span>}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {step.key === "briefing" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="topic" className={labelClass}>
                Tema
              </label>
              <input
                id="topic"
                value={form.topic}
                onChange={(e) => update("topic", e.target.value)}
                placeholder="Ex: A história da chegada à Lua"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="direction" className={labelClass}>
                Briefing <span className="text-neutral-500">(opcional)</span>
              </label>
              <textarea
                id="direction"
                value={form.direction}
                onChange={(e) => update("direction", e.target.value)}
                placeholder="Público-alvo, tom, contexto, o que não pode faltar..."
                rows={4}
                className={`resize-y ${fieldClass}`}
              />
            </div>
          </div>
        )}

        {step.key === "roteiro" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="archetype" className={labelClass}>
                  Arquétipo
                </label>
                <select
                  id="archetype"
                  value={form.archetype}
                  onChange={(e) => update("archetype", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Deixar IA escolher</option>
                  {config.archetypes.map((a) => (
                    <option key={a} value={a}>
                      {formatLabel(a)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="pacing" className={labelClass}>
                  Ritmo
                </label>
                <select
                  id="pacing"
                  value={form.pacing}
                  onChange={(e) => update("pacing", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Padrão do arquétipo</option>
                  {config.pacingTiers.map((p) => (
                    <option key={p} value={p}>
                      {formatLabel(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="targetDurationSeconds" className={labelClass}>
                  Duração-alvo <span className="text-neutral-500">(segundos, opcional)</span>
                </label>
                <input
                  id="targetDurationSeconds"
                  type="number"
                  min={1}
                  value={form.targetDurationSeconds}
                  onChange={(e) => update("targetDurationSeconds", e.target.value)}
                  placeholder="Ex: 45"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Idioma</span>
              <div className="flex gap-2">
                <Chip active={form.language === "pt-BR"} onClick={() => update("language", "pt-BR")}>
                  pt-BR
                </Chip>
                <Chip active={form.language === "en-US"} onClick={() => update("language", "en-US")}>
                  en-US
                </Chip>
              </div>
            </div>
          </div>
        )}

        {step.key === "visual" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="videoMode" className={labelClass}>
                Vídeo
              </label>
              <select
                id="videoMode"
                value={form.videoMode}
                onChange={(e) => update("videoMode", e.target.value as FormState["videoMode"])}
                className={fieldClass}
              >
                <option value="hybrid">Híbrido (imagem + vídeo onde faz sentido)</option>
                <option value="motion_graphics_only">Só imagem (mais barato)</option>
                <option value="ai_video_only">Só vídeo (mais caro)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="aspectRatio" className={labelClass}>
                Formato
              </label>
              <select
                id="aspectRatio"
                value={form.aspectRatio}
                onChange={(e) => update("aspectRatio", e.target.value as FormState["aspectRatio"])}
                className={fieldClass}
              >
                <option value="vertical">Vertical (9:16 — Reels/TikTok/Shorts)</option>
                <option value="horizontal">Horizontal (16:9 — YouTube)</option>
                <option value="square">Quadrado (1:1)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Qualidade</span>
              <div className="flex gap-2">
                <Chip active={form.qualityTier === "draft"} onClick={() => update("qualityTier", "draft")}>
                  Rascunho
                </Chip>
                <Chip active={form.qualityTier === "standard"} onClick={() => update("qualityTier", "standard")}>
                  Padrão
                </Chip>
                <Chip active={form.qualityTier === "high"} onClick={() => update("qualityTier", "high")}>
                  Alta
                </Chip>
              </div>
            </div>
          </div>
        )}

        {step.key === "legendas" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="captionStyle" className={labelClass}>
                Estilo da legenda
              </label>
              <select
                id="captionStyle"
                value={form.captionStyle}
                onChange={(e) => update("captionStyle", e.target.value)}
                className={fieldClass}
              >
                <option value="">Padrão do arquétipo</option>
                {config.captionStyles.map((c) => (
                  <option key={c} value={c}>
                    {formatLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Palavras por vez</span>
              <div className="flex gap-2">
                {CHUNK_SIZE_LEVELS.map((l) => (
                  <Chip key={l.level} active={form.captionChunkLevel === l.level} onClick={() => update("captionChunkLevel", l.level)}>
                    {l.label}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={form.showTextOverlays}
                onChange={(e) => update("showTextOverlays", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
              />
              Mostrar texto animado sobre as cenas (além da legenda de narração)
            </label>
          </div>
        )}

        {step.key === "revisao" && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-neutral-800 bg-neutral-900/50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Tema</dt>
                <dd className="text-neutral-100">{form.topic || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Arquétipo</dt>
                <dd className="text-neutral-100">{form.archetype ? formatLabel(form.archetype) : "IA escolhe"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Ritmo</dt>
                <dd className="text-neutral-100">{form.pacing ? formatLabel(form.pacing) : "Padrão do arquétipo"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Duração-alvo</dt>
                <dd className="text-neutral-100">{form.targetDurationSeconds ? `${form.targetDurationSeconds}s` : "Livre"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Idioma</dt>
                <dd className="text-neutral-100">{form.language}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Vídeo</dt>
                <dd className="text-neutral-100">{formatLabel(form.videoMode)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Formato</dt>
                <dd className="text-neutral-100">{formatLabel(form.aspectRatio)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Legenda</dt>
                <dd className="text-neutral-100">{form.captionStyle ? formatLabel(form.captionStyle) : "Padrão do arquétipo"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Qualidade</dt>
                <dd className="text-neutral-100">{formatLabel(form.qualityTier)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Texto animado</dt>
                <dd className="text-neutral-100">{form.showTextOverlays ? "Sim" : "Não"}</dd>
              </div>
            </dl>
            <p className="text-sm text-neutral-500">
              O custo estimado real (em USD) aparece na próxima tela, antes de qualquer geração começar — você aprova
              ou cancela lá.
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Voltar
          </button>
          {step.key !== "revisao" ? (
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              disabled={!canGoNext}
              className="rounded-md bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canLeaveBriefing || submitting}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {submitting ? "Criando..." : "Gerar vídeo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
