import { useEffect, useState } from "react";
import { getCredits, getFormConfig, getSettings, putCredits, putSettings, youtubeAuthorizeUrl, type Settings } from "../api.js";

type BadgeKind = "free" | "paid" | "optional" | "warning";

const BADGE_STYLES: Record<BadgeKind, string> = {
  free: "bg-status-success-bg text-status-success border-status-success-border",
  paid: "bg-status-warning-bg text-status-warning border-status-warning-border",
  optional: "bg-surface-2 text-fg-secondary border-border-default",
  warning: "bg-status-error-bg text-status-error border-status-error-border",
};

function Badge({ kind, children }: { kind: BadgeKind; children: React.ReactNode }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BADGE_STYLES[kind]}`}
    >
      {children}
    </span>
  );
}

function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning">
      {children}
    </p>
  );
}

/** Nota discreta quando a mesma chave de API aparece em mais de uma categoria (decisão UX Architect +
 * UI Designer, 2026-09-13) — tom neutro (fg-tertiary), não é aviso de problema, é confirmação de reaproveitamento. */
function SharedKeyNote({ alsoIn }: { alsoIn: string[] }) {
  if (alsoIn.length === 0) return null;
  return <p className="text-xs text-fg-tertiary">Mesma chave usada também em {alsoIn.join(" e ")}.</p>;
}

/** Linha compacta pras categorias que não são "dona" da chave OpenRouter (só Roteiro edita o par completo
 * minha-chave/chave-do-sistema) — evita repetir o mesmo par de inputs de senha 4x pra uma chave única. */
function OpenRouterKeyNote({ onGoToRoteiro }: { onGoToRoteiro: () => void }) {
  return (
    <p className="mt-3 border-t border-border-subtle pt-3 text-xs text-fg-tertiary">
      Usa a chave OpenRouter configurada em{" "}
      <button type="button" onClick={onGoToRoteiro} className="text-accent underline">
        Roteiro
      </button>
      .
    </p>
  );
}

interface KeyFieldProps {
  id: keyof Settings;
  label: string;
  settings: Settings;
  value: string;
  onChange(value: string): void;
}

function KeyField({ id, label, settings, value, onChange }: KeyFieldProps) {
  const field = settings[id] as { set: boolean; masked?: string };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg-primary">
          {label}
        </label>
        {field.set && <Badge kind="free">já configurada</Badge>}
      </div>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.set ? `atual: ${field.masked}` : "não configurada"}
        className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent-wash"
      />
    </div>
  );
}

interface KeyPairFieldsProps {
  label: string;
  ownKey: keyof Settings;
  systemKey: keyof Settings;
  helpUrl: string;
  settings: Settings;
  inputs: Record<string, string>;
  onChange(key: string, value: string): void;
  sharedWith?: string[];
}

/** Par "minha chave"/"chave do sistema" (§11A Bloco 6) — mesmo padrão pras 3 chaves que têm esse par
 * (OpenRouter, Google, Fal). Pexels/Pixabay não têm par, usam KeyField direto. */
function KeyPairFields({ label, ownKey, systemKey, helpUrl, settings, inputs, onChange, sharedWith = [] }: KeyPairFieldsProps) {
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">
      <KeyField id={ownKey} label={`${label} (minha chave)`} settings={settings} value={inputs[ownKey] ?? ""} onChange={(v) => onChange(ownKey, v)} />
      <KeyField
        id={systemKey}
        label={`${label} (chave do sistema)`}
        settings={settings}
        value={inputs[systemKey] ?? ""}
        onChange={(v) => onChange(systemKey, v)}
      />
      <SharedKeyNote alsoIn={sharedWith} />
      <a href={helpUrl} target="_blank" rel="noreferrer" className="text-xs text-fg-tertiary underline">
        como conseguir
      </a>
    </div>
  );
}

interface ModelSelectProps {
  id: string;
  value: string;
  options: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  custom: boolean;
  onCustomChange(custom: boolean): void;
  onChange(value: string): void;
}

function ModelSelect({ id, value, options, allowEmpty, emptyLabel, custom, onCustomChange, onChange }: ModelSelectProps) {
  return !custom ? (
    <select
      id={id}
      value={value}
      onChange={(e) => {
        if (e.target.value === "__custom__") {
          onCustomChange(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary focus:border-border-strong focus:outline-none"
    >
      {allowEmpty && <option value="">{emptyLabel ?? "Nenhum"}</option>}
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
      <option value="__custom__">Outro (digitar manualmente)</option>
    </select>
  ) : (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="ex.: mistralai/mistral-large"
      className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
    />
  );
}

/** Degrau numerado da cadeia de fallback (1º → 2º → 3º) — trilha vertical conectada por uma linha,
 * decisão UI Designer 2026-09-13: numeração + conector comunicam "é sequência", sem repetir texto em cada linha. */
function Step({ index, total, children }: { index: number; total: number; children: React.ReactNode }) {
  const roleLabel = index === 1 ? "Usado primeiro" : index === total ? "Última tentativa" : "Se falhar, tenta este";
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
            index === 1 ? "border-accent text-accent" : "border-border-default bg-surface-2 text-fg-secondary"
          }`}
        >
          {index}
        </span>
        {index < total && <span className="w-0.5 flex-1 bg-border-subtle" />}
      </div>
      <div className="flex-1 pb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-tertiary">{roleLabel}</p>
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">{children}</div>
      </div>
    </div>
  );
}

/** Campo de voz condicional (só aparece pra modelo TTS customizado) — usado 2x
 * (TTS_MODEL_FALLBACK_VOICE e TTS_MODEL_FALLBACK_2_VOICE), por isso extraído. */
function CustomVoiceField({ id, value, onChange }: { id: string; value: string; onChange(value: string): void }) {
  return (
    <div className="mt-3 ml-1 flex flex-col gap-1.5 border-l-2 border-border-subtle pl-4">
      <label htmlFor={id} className="text-xs text-fg-tertiary">
        Voz (pode ser obrigatória pra modelo customizado)
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: flux-bree-en"
        className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent-wash"
      />
      <p className="text-xs text-fg-tertiary">
        Achado em teste manual real: um modelo custom pode exigir voz explícita ("An explicit voice is required")
        com nome específico do catálogo dele (ex. flux-bree-en) — cada provider tem o seu. Vazio funciona pra
        maioria (o provider escolhe a própria voz padrão).
      </p>
    </div>
  );
}

function CategoryHeader({ title, description, chained }: { title: string; description: string; chained: boolean }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-fg-primary">{title}</h3>
      <p className="mt-1 text-sm text-fg-tertiary">{description}</p>
      {chained && (
        <p className="mt-2 text-xs text-fg-tertiary">
          Ordem de tentativa: 1º → 2º → 3º. Cada um só entra em ação se o anterior falhar.
        </p>
      )}
    </div>
  );
}

const CATEGORIES = [
  { key: "roteiro", label: "Roteiro" },
  { key: "imagem", label: "Imagem" },
  { key: "video", label: "Vídeo" },
  { key: "narracao", label: "Narração" },
  { key: "musica", label: "Música" },
  { key: "midia", label: "Banco de mídia" },
  { key: "publicacao", label: "Publicação" },
  { key: "creditos", label: "Créditos" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

function CategoryIcon({ category }: { category: Category }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, className: "h-[18px] w-[18px]" } as const;
  switch (category) {
    case "roteiro":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "imagem":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M4 17l5-5 4 4 3-3 4 4" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
        </svg>
      );
    case "narracao":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
        </svg>
      );
    case "musica":
      return (
        <svg {...common}>
          <circle cx="7" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
          <path d="M9.5 18V5.5L19.5 4v11.5" />
        </svg>
      );
    case "midia":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      );
    case "publicacao":
      return (
        <svg {...common}>
          <path d="M12 3v12M12 3l4 4M12 3 8 7" />
          <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
      );
    case "creditos":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 15.5c.5 1 1.5 1.5 2.5 1.5 1.5 0 2.5-.8 2.5-2s-1-1.7-2.5-2-2.5-.8-2.5-2 1-2 2.5-2c1 0 2 .5 2.5 1.5M12 7v1.2M12 15.8V17" />
        </svg>
      );
  }
}

const MODEL_FIELDS = [
  "OPENROUTER_MODEL",
  "OPENROUTER_MODEL_FALLBACK",
  "IMAGE_MODEL",
  "IMAGE_MODEL_FALLBACK",
  "VIDEO_MODEL",
  "VIDEO_MODEL_FALLBACK",
  "TTS_MODEL_FALLBACK",
  "TTS_MODEL_FALLBACK_VOICE",
  "TTS_MODEL_FALLBACK_2",
  "TTS_MODEL_FALLBACK_2_VOICE",
  "MUSIC_PROVIDER",
  "MUSIC_MODEL",
  "MUSIC_MODEL_FALLBACK",
] as const;

export interface SettingsViewProps {
  onClose(): void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("roteiro");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recommendedModels, setRecommendedModels] = useState<string[]>([]);
  const [recommendedImageModels, setRecommendedImageModels] = useState<string[]>([]);
  const [recommendedVideoModels, setRecommendedVideoModels] = useState<string[]>([]);
  const [recommendedTtsFallbackModels, setRecommendedTtsFallbackModels] = useState<string[]>([]);
  const [customFlags, setCustomFlags] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState("");
  const [creditsConsumed, setCreditsConsumed] = useState<number | null>(null);
  const [savingCredits, setSavingCredits] = useState(false);
  const [creditsSaved, setCreditsSaved] = useState(false);

  useEffect(() => {
    getCredits().then((c) => {
      setCreditsBalance(c.balanceUsd.toFixed(2));
      setCreditsConsumed(c.consumedUsd);
    });
  }, []);

  async function handleSaveCredits() {
    const value = Number(creditsBalance);
    if (!Number.isFinite(value) || value < 0) return;
    setSavingCredits(true);
    setCreditsSaved(false);
    try {
      const updated = await putCredits(value);
      setCreditsBalance(updated.balanceUsd.toFixed(2));
      setCreditsConsumed(updated.consumedUsd);
      setCreditsSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingCredits(false);
    }
  }

  useEffect(() => {
    Promise.all([getSettings(), getFormConfig()])
      .then(([s, config]) => {
        setSettings(s);
        setRecommendedModels(config.recommendedModels);
        setRecommendedImageModels(config.recommendedImageModels);
        setRecommendedVideoModels(config.recommendedVideoModels);
        setRecommendedTtsFallbackModels(config.recommendedTtsFallbackModels);
        // Chaves secretas ficam de fora do estado inicial de propósito — são {set, masked},
        // não string, e um campo de senha deve nascer vazio (só o placeholder mostra o mascarado).
        // Prefill-las aqui já causou um bug real: o objeto virava a string "[object Object]" no
        // input e, se o usuário salvasse sem tocar no campo, sobrescrevia a chave real com lixo.
        setInputs(Object.fromEntries(MODEL_FIELDS.map((k) => [k, s[k]])));
        setCustomFlags({
          OPENROUTER_MODEL: s.OPENROUTER_MODEL !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL),
          OPENROUTER_MODEL_FALLBACK:
            s.OPENROUTER_MODEL_FALLBACK !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL_FALLBACK),
          IMAGE_MODEL: s.IMAGE_MODEL !== "" && !config.recommendedImageModels.includes(s.IMAGE_MODEL),
          IMAGE_MODEL_FALLBACK:
            s.IMAGE_MODEL_FALLBACK !== "" && !config.recommendedImageModels.includes(s.IMAGE_MODEL_FALLBACK),
          VIDEO_MODEL: s.VIDEO_MODEL !== "" && !config.recommendedVideoModels.includes(s.VIDEO_MODEL),
          VIDEO_MODEL_FALLBACK:
            s.VIDEO_MODEL_FALLBACK !== "" && !config.recommendedVideoModels.includes(s.VIDEO_MODEL_FALLBACK),
          TTS_MODEL_FALLBACK:
            s.TTS_MODEL_FALLBACK !== "" && !config.recommendedTtsFallbackModels.includes(s.TTS_MODEL_FALLBACK),
          TTS_MODEL_FALLBACK_2:
            s.TTS_MODEL_FALLBACK_2 !== "" && !config.recommendedTtsFallbackModels.includes(s.TTS_MODEL_FALLBACK_2),
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function setField(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setCustom(key: string, custom: boolean) {
    setCustomFlags((prev) => ({ ...prev, [key]: custom }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updates = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v.trim().length > 0));
      await putSettings(updates);
      const fresh = await getSettings();
      setSettings(fresh);
      setInputs(Object.fromEntries(MODEL_FIELDS.map((k) => [k, fresh[k]])));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) {
    return (
      <div className="mx-auto max-w-2xl">
        <p role="alert" className="text-sm text-status-error">
          Não foi possível carregar as configurações: {error}
        </p>
        <button onClick={onClose} className="mt-4 text-sm text-fg-secondary underline">
          Voltar
        </button>
      </div>
    );
  }

  if (!settings) {
    return <p className="mx-auto max-w-2xl text-sm text-fg-secondary">Carregando...</p>;
  }

  const goTo = (c: Category) => () => setActiveCategory(c);

  return (
    <form onSubmit={handleSave} className="flex gap-6">
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border-subtle pr-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg-primary">Configurações</h2>
          <button type="button" onClick={onClose} className="text-xs text-fg-secondary underline">
            Voltar
          </button>
        </div>
        {CATEGORIES.map(({ key, label }) => (
          <div key={key}>
            {key === "creditos" && <div className="my-1 border-t border-border-subtle" />}
            <button
              type="button"
              onClick={goTo(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeCategory === key ? "bg-accent-wash text-accent" : "text-fg-secondary hover:bg-surface-2 hover:text-fg-primary"
              }`}
            >
              <CategoryIcon category={key} />
              {label}
            </button>
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {activeCategory === "roteiro" && (
          <div>
            <CategoryHeader title="Roteiro" description="Escreve o roteiro, planeja as cenas e revisa a qualidade do vídeo." chained />
            <Step index={1} total={2}>
              <div className="flex items-center gap-2">
                <label htmlFor="OPENROUTER_MODEL" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind={inputs.OPENROUTER_MODEL === "openrouter/free" ? "free" : "paid"}>modelo pago por uso</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="OPENROUTER_MODEL"
                  value={inputs.OPENROUTER_MODEL ?? ""}
                  options={recommendedModels}
                  custom={customFlags.OPENROUTER_MODEL ?? false}
                  onCustomChange={(c) => setCustom("OPENROUTER_MODEL", c)}
                  onChange={(v) => setField("OPENROUTER_MODEL", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Sugeridos: preço conhecido e testado com saída estruturada. "openrouter/free" é a opção sem custo.
              </p>
              <KeyPairFields
                label="OpenRouter API Key"
                ownKey="OPENROUTER_API_KEY"
                systemKey="OPENROUTER_API_KEY_SYSTEM"
                helpUrl="https://openrouter.ai/settings/keys"
                settings={settings}
                inputs={inputs}
                onChange={setField}
              />
              <p className="mt-2 text-xs text-fg-tertiary">
                Chave única usada por Roteiro, Imagem, Vídeo e Narração — configure aqui, as outras categorias reaproveitam.
              </p>
            </Step>
            <Step index={2} total={2}>
              <label htmlFor="OPENROUTER_MODEL_FALLBACK" className="text-sm font-medium text-fg-primary">
                Modelo
              </label>
              <div className="mt-1.5">
                <ModelSelect
                  id="OPENROUTER_MODEL_FALLBACK"
                  value={inputs.OPENROUTER_MODEL_FALLBACK ?? ""}
                  options={recommendedModels}
                  allowEmpty
                  custom={customFlags.OPENROUTER_MODEL_FALLBACK ?? false}
                  onCustomChange={(c) => setCustom("OPENROUTER_MODEL_FALLBACK", c)}
                  onChange={(v) => setField("OPENROUTER_MODEL_FALLBACK", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Opcional. Usado automaticamente se o primário falhar (quota, erro, "No output generated"). Campo vazio ao
                salvar não apaga um fallback já configurado.
              </p>
            </Step>
          </div>
        )}

        {activeCategory === "imagem" && (
          <div>
            <CategoryHeader title="Imagem" description="Gera as imagens de fundo de cada cena a partir do roteiro." chained />
            <Step index={1} total={3}>
              <div className="flex items-center gap-2">
                <label htmlFor="IMAGE_MODEL" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="paid">pago por imagem</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="IMAGE_MODEL"
                  value={inputs.IMAGE_MODEL ?? ""}
                  options={recommendedImageModels}
                  allowEmpty
                  emptyLabel="Usar o padrão do sistema"
                  custom={customFlags.IMAGE_MODEL ?? false}
                  onCustomChange={(c) => setCustom("IMAGE_MODEL", c)}
                  onChange={(v) => setField("IMAGE_MODEL", v)}
                />
              </div>
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={2} total={3}>
              <div className="flex items-center gap-2">
                <label htmlFor="IMAGE_MODEL_FALLBACK" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="optional">opcional</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="IMAGE_MODEL_FALLBACK"
                  value={inputs.IMAGE_MODEL_FALLBACK ?? ""}
                  options={recommendedImageModels}
                  allowEmpty
                  custom={customFlags.IMAGE_MODEL_FALLBACK ?? false}
                  onCustomChange={(c) => setCustom("IMAGE_MODEL_FALLBACK", c)}
                  onChange={(v) => setField("IMAGE_MODEL_FALLBACK", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                2º modelo via OpenRouter (mesma chave) — tentado antes do Gemini direto. Útil se o modelo primário
                bater rate limit sozinho (ex. variante ":free", teto de 20 req/min na OpenRouter).
              </p>
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={3} total={3}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">Gemini direto (Google AI Studio)</p>
                <Badge kind="optional">automático</Badge>
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">Assume sozinho se o OpenRouter falhar e a chave abaixo estiver preenchida.</p>
              <KeyPairFields
                label="Google Gemini API Key"
                ownKey="GOOGLE_API_KEY"
                systemKey="GOOGLE_API_KEY_SYSTEM"
                helpUrl="https://aistudio.google.com/apikey"
                settings={settings}
                inputs={inputs}
                onChange={setField}
                sharedWith={["Vídeo", "Narração"]}
              />
              <WarningBanner>
                Requer billing ativado na conta Google Cloud — sem isso, a chave falha com "quota exceeded" (limite
                gratuito zerado), mesmo parecendo configurada certo.
              </WarningBanner>
            </Step>
          </div>
        )}

        {activeCategory === "video" && (
          <div>
            <CategoryHeader
              title="Vídeo"
              description='Gera clipes de vídeo por IA quando a cena pede movimento real. Não roda em todo vídeo — só quando o Roteiro decide usar.'
              chained
            />
            <Step index={1} total={4}>
              <div className="flex items-center gap-2">
                <label htmlFor="VIDEO_MODEL" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="paid">pago por segundo</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="VIDEO_MODEL"
                  value={inputs.VIDEO_MODEL ?? ""}
                  options={recommendedVideoModels}
                  allowEmpty
                  emptyLabel="Usar o padrão do sistema"
                  custom={customFlags.VIDEO_MODEL ?? false}
                  onCustomChange={(c) => setCustom("VIDEO_MODEL", c)}
                  onChange={(v) => setField("VIDEO_MODEL", v)}
                />
              </div>
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={2} total={4}>
              <div className="flex items-center gap-2">
                <label htmlFor="VIDEO_MODEL_FALLBACK" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="optional">opcional</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="VIDEO_MODEL_FALLBACK"
                  value={inputs.VIDEO_MODEL_FALLBACK ?? ""}
                  options={recommendedVideoModels}
                  allowEmpty
                  custom={customFlags.VIDEO_MODEL_FALLBACK ?? false}
                  onCustomChange={(c) => setCustom("VIDEO_MODEL_FALLBACK", c)}
                  onChange={(v) => setField("VIDEO_MODEL_FALLBACK", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                2º modelo via OpenRouter (mesma chave) — tentado antes do Gemini direto.
              </p>
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={3} total={4}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">Gemini direto (Google AI Studio)</p>
                <Badge kind="optional">automático</Badge>
              </div>
              <KeyPairFields
                label="Google Gemini API Key"
                ownKey="GOOGLE_API_KEY"
                systemKey="GOOGLE_API_KEY_SYSTEM"
                helpUrl="https://aistudio.google.com/apikey"
                settings={settings}
                inputs={inputs}
                onChange={setField}
                sharedWith={["Imagem", "Narração"]}
              />
              <WarningBanner>Requer billing ativado na conta Google Cloud — sem isso, a chave falha com "quota exceeded".</WarningBanner>
            </Step>
            <Step index={4} total={4}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">Fal.ai (Kling)</p>
                <Badge kind="optional">automático</Badge>
              </div>
              <KeyPairFields
                label="Fal.ai API Key"
                ownKey="FAL_API_KEY"
                systemKey="FAL_API_KEY_SYSTEM"
                helpUrl="https://fal.ai/dashboard/keys"
                settings={settings}
                inputs={inputs}
                onChange={setField}
              />
            </Step>
          </div>
        )}

        {activeCategory === "narracao" && (
          <div>
            <CategoryHeader title="Narração" description="Transforma o roteiro em áudio narrado." chained />
            <Step index={1} total={4}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">Edge TTS</p>
                <Badge kind="free">grátis, sem chave</Badge>
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Microsoft, sempre ligado, sem configuração. Pode falhar por instabilidade de rede ("Premature close");
                quando isso acontece, o fallback abaixo assume sozinho.
              </p>
            </Step>
            <Step index={2} total={4}>
              <div className="flex items-center gap-2">
                <label htmlFor="TTS_MODEL_FALLBACK" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="paid">pago por caractere</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="TTS_MODEL_FALLBACK"
                  value={inputs.TTS_MODEL_FALLBACK ?? ""}
                  options={recommendedTtsFallbackModels}
                  allowEmpty
                  emptyLabel="Usar o padrão do sistema"
                  custom={customFlags.TTS_MODEL_FALLBACK ?? false}
                  onCustomChange={(c) => setCustom("TTS_MODEL_FALLBACK", c)}
                  onChange={(v) => setField("TTS_MODEL_FALLBACK", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Roda via OpenRouter. Os sugeridos são da família Gemini (voz "Kore" automática).
              </p>
              {customFlags.TTS_MODEL_FALLBACK && (
                <CustomVoiceField
                  id="TTS_MODEL_FALLBACK_VOICE"
                  value={inputs.TTS_MODEL_FALLBACK_VOICE ?? ""}
                  onChange={(v) => setField("TTS_MODEL_FALLBACK_VOICE", v)}
                />
              )}
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={3} total={4}>
              <div className="flex items-center gap-2">
                <label htmlFor="TTS_MODEL_FALLBACK_2" className="text-sm font-medium text-fg-primary">
                  Modelo
                </label>
                <Badge kind="optional">opcional</Badge>
              </div>
              <div className="mt-1.5">
                <ModelSelect
                  id="TTS_MODEL_FALLBACK_2"
                  value={inputs.TTS_MODEL_FALLBACK_2 ?? ""}
                  options={recommendedTtsFallbackModels}
                  allowEmpty
                  custom={customFlags.TTS_MODEL_FALLBACK_2 ?? false}
                  onCustomChange={(c) => setCustom("TTS_MODEL_FALLBACK_2", c)}
                  onChange={(v) => setField("TTS_MODEL_FALLBACK_2", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-fg-tertiary">
                2º modelo via OpenRouter (mesma chave) — tentado antes do Gemini TTS direto.
              </p>
              {customFlags.TTS_MODEL_FALLBACK_2 && (
                <CustomVoiceField
                  id="TTS_MODEL_FALLBACK_2_VOICE"
                  value={inputs.TTS_MODEL_FALLBACK_2_VOICE ?? ""}
                  onChange={(v) => setField("TTS_MODEL_FALLBACK_2_VOICE", v)}
                />
              )}
              <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
            </Step>
            <Step index={4} total={4}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">Gemini TTS direto</p>
                <Badge kind="optional">automático</Badge>
              </div>
              <KeyPairFields
                label="Google Gemini API Key"
                ownKey="GOOGLE_API_KEY"
                systemKey="GOOGLE_API_KEY_SYSTEM"
                helpUrl="https://aistudio.google.com/apikey"
                settings={settings}
                inputs={inputs}
                onChange={setField}
                sharedWith={["Imagem", "Vídeo"]}
              />
            </Step>
          </div>
        )}

        {activeCategory === "musica" && (
          <div>
            <CategoryHeader
              title="Música"
              description="Trilha sonora de fundo do vídeo."
              chained={inputs.MUSIC_PROVIDER === "lyria"}
            />
            <div className="mb-4 rounded-lg border border-border-subtle bg-surface-1 p-4">
              <div className="flex items-center gap-2">
                <label htmlFor="MUSIC_PROVIDER" className="text-sm font-medium text-fg-primary">
                  Fonte
                </label>
                <Badge kind={inputs.MUSIC_PROVIDER === "lyria" ? "warning" : "free"}>
                  {inputs.MUSIC_PROVIDER === "lyria" ? "pago, ainda não testado em produção" : "grátis, sem chave"}
                </Badge>
              </div>
              <select
                id="MUSIC_PROVIDER"
                value={inputs.MUSIC_PROVIDER ?? ""}
                onChange={(e) => setField("MUSIC_PROVIDER", e.target.value)}
                className="mt-1.5 rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary focus:border-border-strong focus:outline-none"
              >
                <option value="">Trilhas prontas (recomendado)</option>
                <option value="lyria">Gerada por IA — Lyria via OpenRouter</option>
              </select>
              {inputs.MUSIC_PROVIDER !== "lyria" && (
                <p className="mt-1.5 text-xs text-fg-tertiary">
                  Biblioteca de faixas prontas royalty-free, escolhida pelo clima (mood) de cada cena — não é gerada
                  por IA.
                </p>
              )}
            </div>

            {inputs.MUSIC_PROVIDER === "lyria" && (
              <>
                <Step index={1} total={3}>
                  <label htmlFor="MUSIC_MODEL" className="text-sm font-medium text-fg-primary">
                    Modelo
                  </label>
                  <input
                    id="MUSIC_MODEL"
                    type="text"
                    value={inputs.MUSIC_MODEL ?? ""}
                    onChange={(e) => setField("MUSIC_MODEL", e.target.value)}
                    placeholder="google/lyria-3-pro-preview (default)"
                    className="mt-1.5 w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-fg-tertiary">
                    Sem lista de sugeridos ainda — nenhum modelo Lyria alternativo foi validado ao vivo até agora
                    (todo teste manual bateu quota=0 do Google, billing não habilitado no projeto do OpenRouter).
                  </p>
                  <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
                </Step>
                <Step index={2} total={3}>
                  <div className="flex items-center gap-2">
                    <label htmlFor="MUSIC_MODEL_FALLBACK" className="text-sm font-medium text-fg-primary">
                      Modelo
                    </label>
                    <Badge kind="optional">opcional</Badge>
                  </div>
                  <input
                    id="MUSIC_MODEL_FALLBACK"
                    type="text"
                    value={inputs.MUSIC_MODEL_FALLBACK ?? ""}
                    onChange={(e) => setField("MUSIC_MODEL_FALLBACK", e.target.value)}
                    placeholder="Ex: outro modelo Lyria/OpenRouter"
                    className="mt-1.5 w-full rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary placeholder:text-fg-tertiary focus:border-border-strong focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-fg-tertiary">
                    2º modelo via OpenRouter (mesma chave) — tentado antes de cair pras trilhas prontas.
                  </p>
                  <OpenRouterKeyNote onGoToRoteiro={goTo("roteiro")} />
                </Step>
                <Step index={3} total={3}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg-primary">Trilhas prontas</p>
                    <Badge kind="free">automático, grátis</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-fg-tertiary">
                    ⚠ Lyria via OpenRouter ainda não foi validada em produção (limite de teste do provedor esgotado
                    nos testes internos). Se todos os modelos acima falharem, cai automaticamente pra biblioteca de
                    faixas prontas royalty-free, escolhida pelo clima (mood) de cada cena.
                  </p>
                </Step>
              </>
            )}
          </div>
        )}

        {activeCategory === "midia" && (
          <div>
            <CategoryHeader
              title="Banco de mídia"
              description='Estratégia alternativa por cena: imagem/vídeo de banco pronto (não gerado por IA) — independente das cadeias de Imagem e Vídeo por IA acima.'
              chained
            />
            <Step index={1} total={2}>
              <KeyField
                id="PEXELS_API_KEY"
                label="Pexels API Key"
                settings={settings}
                value={inputs.PEXELS_API_KEY ?? ""}
                onChange={(v) => setField("PEXELS_API_KEY", v)}
              />
              <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" className="mt-1.5 block text-xs text-fg-tertiary underline">
                como conseguir
              </a>
            </Step>
            <Step index={2} total={2}>
              <KeyField
                id="PIXABAY_API_KEY"
                label="Pixabay API Key"
                settings={settings}
                value={inputs.PIXABAY_API_KEY ?? ""}
                onChange={(v) => setField("PIXABAY_API_KEY", v)}
              />
              <a
                href="https://pixabay.com/api/docs/"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 block text-xs text-fg-tertiary underline"
              >
                como conseguir
              </a>
            </Step>
          </div>
        )}

        {activeCategory === "publicacao" && (
          <div>
            <CategoryHeader
              title="Publicação"
              description="Conecta sua conta do YouTube pra publicar o vídeo direto do ResultPlayer, sem baixar e subir manualmente."
              chained={false}
            />
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-fg-primary">YouTube</p>
                <Badge kind={settings.YOUTUBE_REFRESH_TOKEN.set ? "free" : "optional"}>
                  {settings.YOUTUBE_REFRESH_TOKEN.set ? "conectado" : "não conectado"}
                </Badge>
              </div>
              <KeyField
                id="YOUTUBE_CLIENT_ID"
                label="Client ID"
                settings={settings}
                value={inputs.YOUTUBE_CLIENT_ID ?? ""}
                onChange={(v) => setField("YOUTUBE_CLIENT_ID", v)}
              />
              <KeyField
                id="YOUTUBE_CLIENT_SECRET"
                label="Client Secret"
                settings={settings}
                value={inputs.YOUTUBE_CLIENT_SECRET ?? ""}
                onChange={(v) => setField("YOUTUBE_CLIENT_SECRET", v)}
              />
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-fg-tertiary underline"
              >
                como conseguir
              </a>
              <WarningBanner>
                Crie uma credencial OAuth "App da Web" no Google Cloud Console, com a YouTube Data API v3 habilitada, e
                registre <code>http://localhost:8787/oauth/youtube/callback</code> como URI de redirecionamento
                autorizado. Salve Client ID/Secret aqui antes de conectar.
              </WarningBanner>
              <a
                href={youtubeAuthorizeUrl()}
                className="mt-1 self-start rounded-md border border-border-default px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-2"
              >
                {settings.YOUTUBE_REFRESH_TOKEN.set ? "Reconectar com Google" : "Conectar com Google"}
              </a>
            </div>
          </div>
        )}

        {activeCategory === "creditos" && (
          <div>
            <CategoryHeader
              title="Créditos"
              description="1 crédito = US$ 1. Debitado do saldo quando você aprova o custo estimado de um vídeo. Sem billing real ainda — saldo ajustado manualmente aqui."
              chained={false}
            />
            <div className="flex items-end gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="creditsBalance" className="text-sm font-medium text-fg-primary">
                  Saldo
                </label>
                <input
                  id="creditsBalance"
                  type="number"
                  min={0}
                  step="0.01"
                  value={creditsBalance}
                  onChange={(e) => setCreditsBalance(e.target.value)}
                  className="w-40 rounded-md border border-border-default bg-surface-2 px-3 py-2 text-fg-primary focus:border-border-strong focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCredits}
                disabled={savingCredits}
                className="rounded-md border border-border-default px-3 py-2 text-sm font-medium text-fg-primary hover:bg-surface-2 disabled:opacity-50"
              >
                {savingCredits ? "Salvando..." : "Definir saldo"}
              </button>
              {creditsConsumed !== null && (
                <p className="pb-2.5 text-xs text-fg-tertiary">Consumido até agora: US$ {creditsConsumed.toFixed(2)}</p>
              )}
            </div>
            {creditsSaved && <p className="mt-2 text-sm text-status-success">Saldo atualizado.</p>}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-6 text-sm text-status-error">
            {error}
          </p>
        )}
        {saved && !error && <p className="mt-6 text-sm text-status-success">Salvo — próximo vídeo já usa os valores novos.</p>}

        {activeCategory !== "creditos" && (
          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-md bg-fg-primary px-4 py-2.5 font-medium text-surface-0 transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-tertiary"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        )}
      </div>
    </form>
  );
}
