import { useEffect, useState } from "react";
import {
  createContentProject,
  expandBriefing,
  getTemplate,
  listContentProjects,
  listTemplates,
  type BriefingLength,
  type ContentProject,
  type CreateJobInput,
  type FormConfig,
  type TemplateConfig,
  type TemplateSummary,
  type TemplateVariable,
  type TransitionType,
} from "../../api.js";

/** Fase 18: substitui `{{key}}` (case-sensível, sem espaço dentro das chaves) pelo valor preenchido pelo
 * usuário — chave sem binding preenchido fica como está (usuário ainda não terminou de preencher). */
export function interpolateTemplateVariables(text: string, bindings: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => bindings[key]?.trim() || match);
}

function formatLabel(id: string): string {
  return id.replace(/_/g, " ");
}

const STEPS = [
  { key: "briefing", label: "Briefing" },
  { key: "roteiro", label: "Roteiro" },
  { key: "musica", label: "Música/Som" },
  { key: "narracao", label: "Narração" },
  { key: "visual", label: "Visual" },
  { key: "legendas", label: "Legendas" },
  { key: "abertura", label: "Abertura/Fechamento" },
  { key: "efeitos", label: "Efeitos/Transições" },
  { key: "providers", label: "Providers" },
  { key: "revisao", label: "Revisão/Custo" },
] as const;

const TRANSITION_SPEED_LEVELS = [
  { level: "rapida", label: "Rápida", value: 6 },
  { level: "media", label: "Média", value: 12 },
  { level: "lenta", label: "Lenta", value: 24 },
] as const;

const MUSIC_VOLUME_LEVELS = [
  { level: "baixo", label: "Baixo", value: 0.08 },
  { level: "medio", label: "Médio", value: 0.15 },
  { level: "alto", label: "Alto", value: 0.25 },
] as const;

const CHUNK_SIZE_LEVELS = [
  { level: "poucas", label: "Poucas por vez", value: 2 },
  { level: "medias", label: "Médias", value: 4 },
  { level: "muitas", label: "Muitas por vez", value: 6 },
] as const;

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: "crossfade", label: "Dissolver (crossfade)" },
  { value: "slide_left", label: "Deslizar p/ esquerda" },
  { value: "slide_right", label: "Deslizar p/ direita" },
  { value: "wipe", label: "Varredura (wipe)" },
  { value: "flip", label: "Virar (flip)" },
  { value: "none", label: "Corte seco" },
];

/** Proporção real de cada aspect ratio — geometria, não dado gerado, por isso pode ser mostrado ao vivo
 * no Wizard mesmo antes de existir qualquer cena real (decisão UI Designer + UX Architect, 2026-09-13). */
const ASPECT_RATIO_FRAME: Record<"vertical" | "horizontal" | "square", { ratio: string; label: string }> = {
  vertical: { ratio: "aspect-[9/16]", label: "9:16" },
  horizontal: { ratio: "aspect-[16/9]", label: "16:9" },
  square: { ratio: "aspect-square", label: "1:1" },
};

const QUALITY_TIER_NOTES: Record<"draft" | "standard" | "high", string> = {
  draft: "Mais rápido e mais barato — bom pra testar ideia antes de gerar a versão final.",
  standard: "Equilíbrio padrão de custo x qualidade — recomendado pra maioria dos vídeos.",
  high: "Melhor fidelidade de imagem/vídeo — custo de geração de imagem/vídeo por IA mais alto e render mais lento.",
};

/** Aproximação visual de cada estilo de legenda (não é o output real do renderer, só demonstra a
 * diferença de peso/cor/destaque entre estilos — decisão UI Designer, 2026-09-13). */
const CAPTION_STYLE_PREVIEW: Record<string, string> = {
  bold_outline: "font-extrabold text-fg-primary [text-shadow:2px_2px_0_#000,-2px_-2px_0_#000,2px_-2px_0_#000,-2px_2px_0_#000]",
  clean: "font-medium text-fg-primary",
  gradient_rise: "font-extrabold bg-gradient-to-t from-accent to-fg-primary bg-clip-text text-transparent",
  karaoke_sweep: "font-semibold text-fg-primary underline decoration-accent decoration-4 underline-offset-4",
  color_highlight: "font-semibold text-surface-0 bg-accent px-1.5 py-0.5 rounded",
  block_impact: "font-black uppercase text-fg-primary bg-surface-0/80 px-2 py-1",
  box_highlight: "font-semibold text-fg-primary bg-surface-0/80 px-2 py-1 rounded border border-accent",
};

function FrameBox({
  aspectRatio,
  size = "md",
  active = false,
  children,
}: {
  aspectRatio: "vertical" | "horizontal" | "square";
  size?: "sm" | "md";
  active?: boolean;
  children?: React.ReactNode;
}) {
  const frame = ASPECT_RATIO_FRAME[aspectRatio];
  const width = size === "sm" ? "w-16" : "w-full max-w-56";
  return (
    <div
      className={`flex ${width} flex-col items-center gap-1.5 ${size === "sm" ? "" : "mx-auto"}`}
    >
      <div
        className={`relative flex w-full items-end justify-center overflow-hidden rounded-md border ${frame.ratio} ${
          active ? "border-accent bg-accent-wash" : "border-border-default bg-surface-2"
        }`}
      >
        {children}
      </div>
      <span className={`text-xs ${active ? "font-medium text-accent" : "text-fg-tertiary"}`}>{frame.label}</span>
    </div>
  );
}

interface FormState {
  topic: string;
  direction: string;
  archetype: string;
  pacing: string;
  contentProjectId: string;
  newContentProjectName: string;
  language: "pt-BR" | "en-US";
  narrationEnabled: boolean;
  voiceGender: "female" | "male";
  musicEnabled: boolean;
  musicVolumeLevel: (typeof MUSIC_VOLUME_LEVELS)[number]["level"];
  captionsEnabled: boolean;
  targetDurationSeconds: string;
  videoMode: "motion_graphics_only" | "ai_video_only" | "hybrid";
  captionStyle: string;
  aspectRatio: "vertical" | "horizontal" | "square";
  qualityTier: "draft" | "standard" | "high";
  captionChunkLevel: (typeof CHUNK_SIZE_LEVELS)[number]["level"];
  showTextOverlays: boolean;
  transitionSpeedLevel: (typeof TRANSITION_SPEED_LEVELS)[number]["level"];
  useOwnProviders: boolean;
  introEnabled: boolean;
  introText: string;
  introTransition: TransitionType;
  outroEnabled: boolean;
  outroText: string;
  outroTransition: TransitionType;
}

const INITIAL_STATE: FormState = {
  topic: "",
  direction: "",
  archetype: "",
  pacing: "",
  contentProjectId: "",
  newContentProjectName: "",
  language: "pt-BR",
  narrationEnabled: true,
  voiceGender: "female",
  musicEnabled: true,
  musicVolumeLevel: "medio",
  captionsEnabled: true,
  targetDurationSeconds: "",
  videoMode: "hybrid",
  captionStyle: "",
  aspectRatio: "vertical",
  qualityTier: "standard",
  captionChunkLevel: "medias",
  showTextOverlays: true,
  transitionSpeedLevel: "media",
  useOwnProviders: false,
  introEnabled: false,
  introText: "",
  introTransition: "crossfade",
  outroEnabled: false,
  outroText: "",
  outroTransition: "crossfade",
};

/** Reverte um valor numérico salvo em template pro "level" mais próximo (mesma direção inversa do
 * `.find((l) => l.level === form.xLevel)!.value` usado no submit) — sem valor, cai no default atual. */
function nearestLevel<L extends string>(levels: readonly { level: L; value: number }[], value: number | undefined, fallback: L): L {
  if (value == null) return fallback;
  return levels.reduce((best, l) => (Math.abs(l.value - value) < Math.abs(best.value - value) ? l : best)).level;
}

/** Reverte width/height (só isso é persistido no config, não `aspectRatio`) pro enum do wizard —
 * mesma tabela de `RESOLUTION_BY_ASPECT_RATIO` em jobs.ts, direção inversa. */
function aspectRatioFromDimensions(width?: number, height?: number): FormState["aspectRatio"] {
  if (!width || !height) return "vertical";
  if (width === height) return "square";
  return width > height ? "horizontal" : "vertical";
}

/** Aplica um template salvo (Fase 17) sobre o form — não inclui `topic`/`contentProjectId` (não fazem
 * parte do config salvo, o usuário preenche/escolhe de novo a cada produção). */
function applyTemplateConfig(config: TemplateConfig): Partial<FormState> {
  return {
    direction: config.direction ?? "",
    archetype: config.archetype ?? "",
    pacing: config.pacing ?? "",
    language: config.language === "en-US" ? "en-US" : "pt-BR",
    narrationEnabled: config.narrationEnabled ?? true,
    voiceGender: config.voiceGender ?? "female",
    musicEnabled: config.musicEnabled ?? true,
    musicVolumeLevel: nearestLevel(MUSIC_VOLUME_LEVELS, config.musicVolume, "medio"),
    captionsEnabled: config.captionsEnabled ?? true,
    targetDurationSeconds: config.targetDurationSeconds ? String(config.targetDurationSeconds) : "",
    videoMode: config.videoMode ?? "hybrid",
    captionStyle: config.captionStyle ?? "",
    aspectRatio: aspectRatioFromDimensions(config.width, config.height),
    qualityTier: config.qualityTier ?? "standard",
    captionChunkLevel: nearestLevel(CHUNK_SIZE_LEVELS, config.captionChunkSize, "medias"),
    showTextOverlays: config.showTextOverlays ?? true,
    transitionSpeedLevel: nearestLevel(TRANSITION_SPEED_LEVELS, config.transitionDurationFrames, "media"),
    useOwnProviders: config.useOwnProviders ?? false,
    introEnabled: config.intro?.mode === "generated",
    introText: config.intro?.text ?? "",
    introTransition: config.intro?.transition ?? "crossfade",
    outroEnabled: config.outro?.mode === "generated",
    outroText: config.outro?.text ?? "",
    outroTransition: config.outro?.transition ?? "crossfade",
  };
}

const fieldClass =
  "rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent-wash";
const labelClass = "text-sm font-medium text-fg-primary";

function Chip({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent-wash text-accent-hover"
          : "border-border-default bg-surface-2 text-fg-secondary hover:border-border-strong"
      }`}
    >
      {children}
    </button>
  );
}

function StepIcon({ done, active, index }: { done: boolean; active: boolean; index: number }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs";
  if (done) return <span className={`${base} border-status-success-border bg-status-success-bg text-status-success`}>✓</span>;
  if (active) return <span className={`${base} border-accent bg-accent text-surface-0`}>{index + 1}</span>;
  return <span className={`${base} border-border-default text-fg-tertiary`}>{index + 1}</span>;
}

/** Painel de resumo persistente (320px, ≥1280px) — feedback ao vivo das escolhas já feitas, visível em
 * toda etapa menos Revisão (que já mostra a versão completa). Reuso do slot de contexto do shell (Fase
 * redesign desktop-first, etapa 2) em vez de um "palco" inventado por etapa sem dado real pra mostrar. */
function SummaryPanel({ form }: { form: FormState }) {
  const rows: { label: string; value: string }[] = [
    { label: "Tema", value: form.topic.trim() || "—" },
    { label: "Formato", value: ASPECT_RATIO_FRAME[form.aspectRatio].label },
    { label: "Qualidade", value: formatLabel(form.qualityTier) },
    {
      label: "Narração",
      value: form.narrationEnabled ? (form.voiceGender === "female" ? "Voz feminina" : "Voz masculina") : "Desligada",
    },
    { label: "Música", value: form.musicEnabled ? "Ligada" : "Desligada" },
    { label: "Legenda", value: form.captionsEnabled ? form.captionStyle ? formatLabel(form.captionStyle) : "Padrão" : "Desligada" },
  ];

  return (
    <aside className="hidden w-context-panel shrink-0 flex-col gap-3 border-l border-border-subtle pl-6 xl:flex">
      <p className={labelClass}>Resumo</p>
      <dl className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-fg-tertiary">{r.label}</dt>
            <dd className="text-sm text-fg-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-fg-tertiary">O custo estimado real aparece depois de "Gerar vídeo", antes de qualquer geração começar.</p>
    </aside>
  );
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
  const [contentProjects, setContentProjects] = useState<ContentProject[]>([]);
  const [creatingContentProject, setCreatingContentProject] = useState(false);
  const [contentProjectError, setContentProjectError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [variableBindings, setVariableBindings] = useState<Record<string, string>>({});
  const [briefingLength, setBriefingLength] = useState<BriefingLength>("balanced");
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  useEffect(() => {
    listContentProjects()
      .then(setContentProjects)
      .catch(() => {
        // Lista de projetos é opcional pro fluxo — falha de rede não deve travar o wizard.
      });
    listTemplates()
      .then(setTemplates)
      .catch(() => {
        // Lista de templates é opcional pro fluxo — falha de rede não deve travar o wizard.
      });
  }, []);

  async function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    setTemplateError(null);
    setTemplateVariables([]);
    setVariableBindings({});
    if (!id) return;
    setLoadingTemplate(true);
    try {
      const template = await getTemplate(id);
      setForm((f) => ({ ...f, ...applyTemplateConfig(template.config) }));
      setTemplateVariables(template.variableSchema);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleGenerateBriefing() {
    if (!form.topic.trim() || generatingBriefing) return;
    setGeneratingBriefing(true);
    setBriefingError(null);
    try {
      const { direction } = await expandBriefing(form.topic.trim(), briefingLength, form.language);
      update("direction", direction);
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingBriefing(false);
    }
  }

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

  async function handleSubmit() {
    if (!canLeaveBriefing || submitting) return;
    let contentProjectId = form.contentProjectId || undefined;
    if (form.newContentProjectName.trim()) {
      setCreatingContentProject(true);
      setContentProjectError(null);
      try {
        const created = await createContentProject(form.newContentProjectName.trim());
        contentProjectId = created.id;
        // Grava o id criado e limpa o nome — evita recriar o projeto duplicado se o usuário reenviar após falha do job.
        update("contentProjectId", created.id);
        update("newContentProjectName", "");
      } catch (err) {
        setContentProjectError(err instanceof Error ? err.message : String(err));
        setCreatingContentProject(false);
        return;
      }
      setCreatingContentProject(false);
    }
    const targetDurationSeconds = Number(form.targetDurationSeconds);
    const direction =
      templateVariables.length > 0 ? interpolateTemplateVariables(form.direction, variableBindings) : form.direction;
    onSubmit({
      topic: form.topic.trim(),
      direction: direction.trim() || undefined,
      archetype: form.archetype || undefined,
      pacing: form.pacing || undefined,
      contentProjectId,
      language: form.language,
      narrationEnabled: form.narrationEnabled,
      voiceGender: form.voiceGender,
      musicEnabled: form.musicEnabled,
      musicVolume: form.musicEnabled
        ? MUSIC_VOLUME_LEVELS.find((l) => l.level === form.musicVolumeLevel)!.value
        : undefined,
      captionsEnabled: form.captionsEnabled,
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
      transitionDurationFrames: TRANSITION_SPEED_LEVELS.find((l) => l.level === form.transitionSpeedLevel)!.value,
      useOwnProviders: form.useOwnProviders,
      intro: form.introEnabled
        ? { mode: "generated", text: form.introText.trim() || undefined, transition: form.introTransition }
        : undefined,
      outro: form.outroEnabled
        ? { mode: "generated", text: form.outroText.trim() || undefined, transition: form.outroTransition }
        : undefined,
    });
  }

  return (
    <div className="flex gap-6">
      <nav
        className={`flex shrink-0 flex-col gap-1 border-r border-border-subtle pr-4 ${collapsed ? "w-stepper-collapsed" : "w-stepper"}`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir etapas" : "Recolher etapas"}
          className="mb-2 self-end text-fg-tertiary hover:text-fg-secondary"
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
              i === stepIndex ? "bg-surface-1 font-semibold text-fg-primary" : "text-fg-tertiary hover:text-fg-secondary"
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
            {templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="templateId" className={labelClass}>
                  Começar de um template <span className="text-fg-tertiary">(opcional)</span>
                </label>
                <select
                  id="templateId"
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  disabled={loadingTemplate}
                  className={fieldClass}
                >
                  <option value="">Começar do zero</option>
                  {templates.map((t) => {
                    const projectName = contentProjects.find((p) => p.id === t.contentProjectId)?.name;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.version > 1 ? ` (v${t.version})` : ""}
                        {projectName ? ` — ${projectName}` : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-fg-tertiary">
                  Preenche arquétipo, visual, música, narração, legendas etc. com as decisões salvas — tema e projeto
                  continuam livres. Nome de template é único entre TODOS os projetos — salvar de novo com o mesmo
                  nome sobrescreve, mesmo vindo de outro projeto.
                </p>
                {templateError && (
                  <p role="alert" className="text-xs text-status-error">
                    {templateError}
                  </p>
                )}
              </div>
            )}
            {templateVariables.length > 0 && (
              <div className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-1 p-4">
                <p className={labelClass}>Variáveis do template</p>
                <p className="text-xs text-fg-tertiary">
                  Preenche <code>{"{{CHAVE}}"}</code> dentro do Briefing abaixo antes de criar o vídeo.
                </p>
                {templateVariables.map((v) => (
                  <div key={v.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`var-${v.key}`} className={labelClass}>
                      {v.label}
                    </label>
                    <input
                      id={`var-${v.key}`}
                      value={variableBindings[v.key] ?? ""}
                      onChange={(e) => setVariableBindings((b) => ({ ...b, [v.key]: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            )}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="direction" className={labelClass}>
                  Briefing <span className="text-fg-tertiary">(opcional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {(
                      [
                        { value: "compact", label: "Compacto" },
                        { value: "balanced", label: "Equilibrado" },
                        { value: "verbose", label: "Verboso" },
                      ] as const
                    ).map((l) => (
                      <Chip key={l.value} active={briefingLength === l.value} onClick={() => setBriefingLength(l.value)}>
                        {l.label}
                      </Chip>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBriefing}
                    disabled={!form.topic.trim() || generatingBriefing}
                    className="text-sm text-fg-tertiary underline hover:text-fg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingBriefing ? "Gerando..." : "Gerar automaticamente"}
                  </button>
                </div>
              </div>
              <textarea
                id="direction"
                value={form.direction}
                onChange={(e) => update("direction", e.target.value)}
                placeholder="Público-alvo, tom, contexto, o que não pode faltar..."
                rows={4}
                className={`resize-y ${fieldClass}`}
              />
              <p className="text-xs text-fg-tertiary">
                Rascunho gerado por IA a partir do tema — dá pra saber o que vai ser narrado antes de gerar o vídeo.
                Revise e edite à vontade.
              </p>
              {briefingError && (
                <p role="alert" className="text-xs text-status-error">
                  {briefingError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contentProjectId" className={labelClass}>
                Projeto <span className="text-fg-tertiary">(opcional — agrupa vídeos de um mesmo canal/série)</span>
              </label>
              <select
                id="contentProjectId"
                value={form.contentProjectId}
                onChange={(e) => update("contentProjectId", e.target.value)}
                disabled={form.newContentProjectName.trim().length > 0}
                className={fieldClass}
              >
                <option value="">Nenhum</option>
                {contentProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={form.newContentProjectName}
                onChange={(e) => update("newContentProjectName", e.target.value)}
                placeholder="Ou criar novo projeto..."
                className={fieldClass}
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
                  Duração-alvo <span className="text-fg-tertiary">(segundos, opcional)</span>
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

        {step.key === "musica" && (
          <div className="flex flex-col gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
              <input
                type="checkbox"
                checked={form.musicEnabled}
                onChange={(e) => update("musicEnabled", e.target.checked)}
                className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
              />
              Música de fundo
            </label>
            {form.musicEnabled && (
              <div className="flex flex-col gap-1.5">
                <span className={labelClass}>Volume</span>
                <div className="flex gap-2">
                  {MUSIC_VOLUME_LEVELS.map((l) => (
                    <Chip key={l.level} active={form.musicVolumeLevel === l.level} onClick={() => update("musicVolumeLevel", l.level)}>
                      {l.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-fg-tertiary">
              O clima da trilha (épico, calmo, animado...) é escolhido automaticamente pela IA a partir do roteiro —
              aqui você só liga/desliga e ajusta o volume.
            </p>
          </div>
        )}

        {step.key === "narracao" && (
          <div className="flex flex-col gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
              <input
                type="checkbox"
                checked={form.narrationEnabled}
                onChange={(e) => update("narrationEnabled", e.target.checked)}
                className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
              />
              Narração falada
            </label>
            {form.narrationEnabled ? (
              <div className="flex flex-col gap-1.5">
                <span className={labelClass}>Voz da narração</span>
                <div className="flex gap-2">
                  <Chip active={form.voiceGender === "female"} onClick={() => update("voiceGender", "female")}>
                    Feminina
                  </Chip>
                  <Chip active={form.voiceGender === "male"} onClick={() => update("voiceGender", "male")}>
                    Masculina
                  </Chip>
                </div>
                <p className="text-sm text-fg-tertiary">Voz gerada automaticamente (Edge TTS) no idioma escolhido em Roteiro.</p>
              </div>
            ) : (
              <p className="text-sm text-fg-tertiary">
                Vídeo mudo (sem voz) — a duração de cada cena passa a ser estimada pelo tamanho do texto do roteiro
                em vez do áudio. Legenda continua disponível na etapa seguinte, se quiser.
              </p>
            )}
          </div>
        )}

        {step.key === "visual" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-4">
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
                <p className="text-sm text-fg-tertiary">{QUALITY_TIER_NOTES[form.qualityTier]}</p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              {(["vertical", "horizontal", "square"] as const).map((ratio) => (
                <button key={ratio} type="button" onClick={() => update("aspectRatio", ratio)}>
                  <FrameBox aspectRatio={ratio} size="sm" active={form.aspectRatio === ratio} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step.key === "legendas" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
                <input
                  type="checkbox"
                  checked={form.captionsEnabled}
                  onChange={(e) => update("captionsEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
                />
                Legenda de narração
                {!form.narrationEnabled && form.captionsEnabled && (
                  <span className="font-normal text-fg-tertiary">(sincronizada pela duração estimada, sem narração)</span>
                )}
              </label>

              {form.captionsEnabled && (
                <>
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
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-fg-primary">
                <input
                  type="checkbox"
                  checked={form.showTextOverlays}
                  onChange={(e) => update("showTextOverlays", e.target.checked)}
                  className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
                />
                Mostrar texto animado sobre as cenas (além da legenda de narração)
              </label>
            </div>

            {form.captionsEnabled && (
              <div className="flex flex-col items-center gap-1.5">
                <FrameBox aspectRatio={form.aspectRatio}>
                  <span
                    className={`mb-4 max-w-[85%] text-balance text-center text-sm ${
                      form.captionStyle ? CAPTION_STYLE_PREVIEW[form.captionStyle] : CAPTION_STYLE_PREVIEW.clean
                    }`}
                  >
                    Isso é um exemplo de legenda
                  </span>
                </FrameBox>
                <span className="text-xs text-fg-tertiary">
                  {form.captionStyle ? formatLabel(form.captionStyle) : "Padrão do arquétipo"} (aproximação — o
                  resultado real sai do renderer)
                </span>
              </div>
            )}
          </div>
        )}

        {step.key === "abertura" && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
                <input
                  type="checkbox"
                  checked={form.introEnabled}
                  onChange={(e) => update("introEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
                />
                Abertura
              </label>
              {form.introEnabled && (
                <div className="flex flex-col gap-3 pl-6">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="introText" className={labelClass}>
                      Texto <span className="text-fg-tertiary">(vazio = IA gera a partir do tema)</span>
                    </label>
                    <input
                      id="introText"
                      value={form.introText}
                      onChange={(e) => update("introText", e.target.value)}
                      placeholder="Ex: Você sabia que..."
                      className={fieldClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="introTransition" className={labelClass}>
                      Transição
                    </label>
                    <select
                      id="introTransition"
                      value={form.introTransition}
                      onChange={(e) => update("introTransition", e.target.value as TransitionType)}
                      className={fieldClass}
                    >
                      {TRANSITIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-fg-primary">
                <input
                  type="checkbox"
                  checked={form.outroEnabled}
                  onChange={(e) => update("outroEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-border-default bg-surface-1 accent-accent"
                />
                Encerramento
              </label>
              {form.outroEnabled && (
                <div className="flex flex-col gap-3 pl-6">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="outroText" className={labelClass}>
                      Texto <span className="text-fg-tertiary">(vazio = IA gera a partir do tema)</span>
                    </label>
                    <input
                      id="outroText"
                      value={form.outroText}
                      onChange={(e) => update("outroText", e.target.value)}
                      placeholder="Ex: Se inscreva pra mais!"
                      className={fieldClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="outroTransition" className={labelClass}>
                      Transição
                    </label>
                    <select
                      id="outroTransition"
                      value={form.outroTransition}
                      onChange={(e) => update("outroTransition", e.target.value as TransitionType)}
                      className={fieldClass}
                    >
                      {TRANSITIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-fg-tertiary">
              Upload de vídeo próprio pra abertura/encerramento ainda não está disponível — só geração automática por
              enquanto.
            </p>
          </div>
        )}

        {step.key === "efeitos" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Velocidade das transições entre cenas</span>
              <div className="flex gap-2">
                {TRANSITION_SPEED_LEVELS.map((l) => (
                  <Chip
                    key={l.level}
                    active={form.transitionSpeedLevel === l.level}
                    onClick={() => update("transitionSpeedLevel", l.level)}
                  >
                    {l.label}
                  </Chip>
                ))}
              </div>
              <p className="text-sm text-fg-tertiary">
                O tipo de transição (dissolver, deslizar, varredura...) é escolhido automaticamente cena a cena pela
                IA — aqui você controla só a duração.
              </p>
            </div>
          </div>
        )}

        {step.key === "providers" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Chaves usadas na geração</span>
              <div className="flex gap-2">
                <Chip active={!form.useOwnProviders} onClick={() => update("useOwnProviders", false)}>
                  Usar sistema (recomendado)
                </Chip>
                <Chip active={form.useOwnProviders} onClick={() => update("useOwnProviders", true)}>
                  Usar minhas próprias chaves
                </Chip>
              </div>
              <p className="text-sm text-fg-tertiary">
                {form.useOwnProviders
                  ? "Este vídeo usa suas próprias chaves de API (configuradas em Configurações) — não debita do seu saldo de créditos. Sem chave própria configurada pra algum provedor, a geração falha nessa etapa."
                  : "Este vídeo usa os modelos/chaves do sistema — debita do saldo de créditos na aprovação do custo estimado."}
              </p>
            </div>
          </div>
        )}

        {step.key === "revisao" && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-border-subtle bg-surface-1 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-fg-tertiary">Tema</dt>
                <dd className="text-fg-primary">{form.topic || "—"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Projeto</dt>
                <dd className="text-fg-primary">
                  {form.newContentProjectName.trim() ||
                    contentProjects.find((p) => p.id === form.contentProjectId)?.name ||
                    "Nenhum"}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Arquétipo</dt>
                <dd className="text-fg-primary">{form.archetype ? formatLabel(form.archetype) : "IA escolhe"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Ritmo</dt>
                <dd className="text-fg-primary">{form.pacing ? formatLabel(form.pacing) : "Padrão do arquétipo"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Duração-alvo</dt>
                <dd className="text-fg-primary">{form.targetDurationSeconds ? `${form.targetDurationSeconds}s` : "Livre"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Idioma</dt>
                <dd className="text-fg-primary">{form.language}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Narração</dt>
                <dd className="text-fg-primary">
                  {form.narrationEnabled ? `Ligada (voz ${form.voiceGender === "female" ? "feminina" : "masculina"})` : "Desligada (vídeo mudo)"}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Música</dt>
                <dd className="text-fg-primary">
                  {form.musicEnabled
                    ? `Ligada (volume ${MUSIC_VOLUME_LEVELS.find((l) => l.level === form.musicVolumeLevel)!.label})`
                    : "Desligada"}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Vídeo</dt>
                <dd className="text-fg-primary">{formatLabel(form.videoMode)}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Formato</dt>
                <dd className="text-fg-primary">{formatLabel(form.aspectRatio)}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Legenda</dt>
                <dd className="text-fg-primary">
                  {form.captionsEnabled
                    ? form.captionStyle
                      ? formatLabel(form.captionStyle)
                      : "Padrão do arquétipo"
                    : "Desligada"}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Qualidade</dt>
                <dd className="text-fg-primary">{formatLabel(form.qualityTier)}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Texto animado</dt>
                <dd className="text-fg-primary">{form.showTextOverlays ? "Sim" : "Não"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Transições</dt>
                <dd className="text-fg-primary">
                  {TRANSITION_SPEED_LEVELS.find((l) => l.level === form.transitionSpeedLevel)!.label}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Chaves</dt>
                <dd className="text-fg-primary">{form.useOwnProviders ? "Minhas próprias" : "Sistema (debita créditos)"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Abertura</dt>
                <dd className="text-fg-primary">{form.introEnabled ? form.introText.trim() || "Gerada por IA" : "Nenhuma"}</dd>
              </div>
              <div>
                <dt className="text-fg-tertiary">Encerramento</dt>
                <dd className="text-fg-primary">{form.outroEnabled ? form.outroText.trim() || "Gerado por IA" : "Nenhum"}</dd>
              </div>
            </dl>
            <p className="text-sm text-fg-tertiary">
              O custo estimado real (em USD) aparece na próxima tela, antes de qualquer geração começar — você aprova
              ou cancela lá.
            </p>
          </div>
        )}

        {contentProjectError && step.key === "revisao" && (
          <p role="alert" className="text-sm text-status-error">
            Não foi possível criar o projeto: {contentProjectError}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-medium text-fg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Voltar
          </button>
          {step.key !== "revisao" ? (
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              disabled={!canGoNext}
              className="rounded-md bg-fg-primary px-4 py-2 text-sm font-medium text-surface-0 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-tertiary"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canLeaveBriefing || submitting || creatingContentProject}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-0 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-tertiary"
            >
              {submitting || creatingContentProject ? "Criando..." : "Gerar vídeo"}
            </button>
          )}
        </div>
      </div>

      {step.key !== "revisao" && <SummaryPanel form={form} />}
    </div>
  );
}
