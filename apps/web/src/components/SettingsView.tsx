import { useEffect, useState } from "react";
import { getCredits, getFormConfig, getSettings, putCredits, putSettings, type Settings } from "../api.js";

interface SecretFieldConfig {
  key: keyof Settings;
  label: string;
  helpUrl: string;
  usedBy: string;
}

const SECRET_FIELDS: SecretFieldConfig[] = [
  {
    key: "OPENROUTER_API_KEY",
    label: "OpenRouter API Key",
    helpUrl: "https://openrouter.ai/settings/keys",
    usedBy: "Obrigatória. Usada por Roteiro, Imagem, Vídeo e Narração (fallback) — uma chave só para quase tudo.",
  },
  {
    key: "GOOGLE_API_KEY",
    label: "Google Gemini API Key",
    helpUrl: "https://aistudio.google.com/apikey",
    usedBy: "Opcional. Reforço extra de Imagem/Narração — o Gemini direto assume automaticamente se o OpenRouter falhar.",
  },
  {
    key: "FAL_API_KEY",
    label: "Fal.ai API Key",
    helpUrl: "https://fal.ai/dashboard/keys",
    usedBy: "Opcional. 2ª alternativa de Vídeo (Kling) — reforço extra além do OpenRouter/Gemini.",
  },
  {
    key: "PEXELS_API_KEY",
    label: "Pexels API Key",
    helpUrl: "https://www.pexels.com/api/",
    usedBy: "Opcional. Banco de fotos/vídeos prontos (não gerados por IA) — usado quando disponível, é mais barato.",
  },
  {
    key: "PIXABAY_API_KEY",
    label: "Pixabay API Key",
    helpUrl: "https://pixabay.com/api/docs/",
    usedBy: "Opcional. Mesmo papel do Pexels — 2ª fonte de fotos/vídeos prontos.",
  },
];

type BadgeKind = "free" | "paid" | "optional" | "warning";

const BADGE_STYLES: Record<BadgeKind, string> = {
  free: "bg-emerald-950 text-emerald-400 border-emerald-800",
  paid: "bg-amber-950 text-amber-400 border-amber-800",
  optional: "bg-neutral-800 text-neutral-400 border-neutral-700",
  warning: "bg-red-950 text-red-400 border-red-800",
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
      className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
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
      className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
        <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({
  role,
  badge,
  label,
  hint,
  children,
}: {
  role: "Primário" | "Fallback";
  badge: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{role}</span>
        {badge}
      </div>
      <label htmlFor={label} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      {children}
      <p className="text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

const MODEL_FIELDS = [
  "OPENROUTER_MODEL",
  "OPENROUTER_MODEL_FALLBACK",
  "IMAGE_MODEL",
  "VIDEO_MODEL",
  "TTS_MODEL_FALLBACK",
  "MUSIC_PROVIDER",
] as const;

export interface SettingsViewProps {
  onClose(): void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
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
        setInputs(Object.fromEntries(MODEL_FIELDS.map((k) => [k, s[k]])));
        setCustomFlags({
          OPENROUTER_MODEL: s.OPENROUTER_MODEL !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL),
          OPENROUTER_MODEL_FALLBACK:
            s.OPENROUTER_MODEL_FALLBACK !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL_FALLBACK),
          IMAGE_MODEL: s.IMAGE_MODEL !== "" && !config.recommendedImageModels.includes(s.IMAGE_MODEL),
          VIDEO_MODEL: s.VIDEO_MODEL !== "" && !config.recommendedVideoModels.includes(s.VIDEO_MODEL),
          TTS_MODEL_FALLBACK:
            s.TTS_MODEL_FALLBACK !== "" && !config.recommendedTtsFallbackModels.includes(s.TTS_MODEL_FALLBACK),
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
        <p role="alert" className="text-sm text-red-400">
          Não foi possível carregar as configurações: {error}
        </p>
        <button onClick={onClose} className="mt-4 text-sm text-neutral-400 underline">
          Voltar
        </button>
      </div>
    );
  }

  if (!settings) {
    return <p className="mx-auto max-w-2xl text-sm text-neutral-400">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSave} className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-50">Configurações</h2>
          <p className="text-xs text-neutral-500">
            Cada etapa da produção do vídeo tem um provedor <strong>primário</strong> e um{" "}
            <strong>fallback</strong> — o fallback só entra em ação automaticamente se o primário falhar.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-neutral-400 underline">
          Voltar
        </button>
      </div>

      <Section title="1. Roteiro" description="Escreve o roteiro, planeja as cenas e revisa a qualidade do vídeo.">
        <Row
          role="Primário"
          badge={<Badge kind={inputs.OPENROUTER_MODEL === "openrouter/free" ? "free" : "paid"}>modelo pago por uso</Badge>}
          label="OPENROUTER_MODEL"
          hint='Sugeridos: preço conhecido e testado com saída estruturada. "openrouter/free" é a opção sem custo.'
        >
          <ModelSelect
            id="OPENROUTER_MODEL"
            value={inputs.OPENROUTER_MODEL ?? ""}
            options={recommendedModels}
            custom={customFlags.OPENROUTER_MODEL ?? false}
            onCustomChange={(c) => setCustom("OPENROUTER_MODEL", c)}
            onChange={(v) => setField("OPENROUTER_MODEL", v)}
          />
        </Row>
        <Row
          role="Fallback"
          badge={<Badge kind="optional">opcional</Badge>}
          label="OPENROUTER_MODEL_FALLBACK"
          hint='Usado automaticamente se o primário falhar (quota, erro, "No output generated"). Campo vazio ao salvar não apaga um fallback já configurado.'
        >
          <ModelSelect
            id="OPENROUTER_MODEL_FALLBACK"
            value={inputs.OPENROUTER_MODEL_FALLBACK ?? ""}
            options={recommendedModels}
            allowEmpty
            custom={customFlags.OPENROUTER_MODEL_FALLBACK ?? false}
            onCustomChange={(c) => setCustom("OPENROUTER_MODEL_FALLBACK", c)}
            onChange={(v) => setField("OPENROUTER_MODEL_FALLBACK", v)}
          />
        </Row>
      </Section>

      <Section title="2. Imagem" description="Gera as imagens de fundo de cada cena a partir do roteiro.">
        <Row
          role="Primário"
          badge={<Badge kind="paid">pago por imagem</Badge>}
          label="IMAGE_MODEL"
          hint="Roda via OpenRouter, com a mesma chave do Roteiro — não precisa de conta separada."
        >
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
        </Row>
        <Row
          role="Fallback"
          badge={<Badge kind="optional">precisa de Google API Key</Badge>}
          label="fallback-imagem-info"
          hint="Automático — sem escolha aqui. Se o OpenRouter falhar e a Google API Key (abaixo) estiver preenchida, o Gemini direto assume."
        >
          <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-400">
            Gemini direto (Google AI Studio)
          </p>
        </Row>
      </Section>

      <Section
        title="3. Vídeo"
        description='Gera clipes de vídeo por IA quando a cena pede movimento real. Não roda em todo vídeo — só quando a etapa "Roteiro" decide usar.'
      >
        <Row
          role="Primário"
          badge={<Badge kind="paid">pago por segundo</Badge>}
          label="VIDEO_MODEL"
          hint="Roda via OpenRouter, com a mesma chave do Roteiro — não precisa de conta separada."
        >
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
        </Row>
        <Row
          role="Fallback"
          badge={<Badge kind="optional">precisa de Google/Fal API Key</Badge>}
          label="fallback-video-info"
          hint="Automático — sem escolha aqui. Se o OpenRouter falhar, tenta Gemini direto e depois Fal.ai, na ordem, só com as chaves correspondentes preenchidas."
        >
          <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-400">
            Gemini direto → Fal.ai (Kling)
          </p>
        </Row>
      </Section>

      <Section title="4. Narração" description="Transforma o roteiro em áudio narrado.">
        <Row
          role="Primário"
          badge={<Badge kind="free">grátis, sem chave</Badge>}
          label="primario-narracao-info"
          hint='Edge TTS (Microsoft) — sempre ligado, sem configuração. Pode falhar por instabilidade de rede ("Premature close"); quando isso acontece, o fallback abaixo assume sozinho.'
        >
          <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-400">
            Edge TTS
          </p>
        </Row>
        <Row
          role="Fallback"
          badge={<Badge kind="paid">pago por caractere</Badge>}
          label="TTS_MODEL_FALLBACK"
          hint="Roda via OpenRouter, mesma chave do Roteiro. Restrito a modelos da família Gemini (voz e formato de áudio compatíveis)."
        >
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
        </Row>
      </Section>

      <Section title="5. Música" description="Trilha sonora de fundo do vídeo.">
        <Row
          role="Primário"
          badge={
            inputs.MUSIC_PROVIDER === "lyria" ? (
              <Badge kind="warning">pago, ainda não testado em produção</Badge>
            ) : (
              <Badge kind="free">grátis, sem chave</Badge>
            )
          }
          label="MUSIC_PROVIDER"
          hint={
            inputs.MUSIC_PROVIDER === "lyria"
              ? "⚠️ Lyria via OpenRouter ainda não foi validada em produção (limite de teste do provedor esgotado nos testes internos). Se falhar, cai automaticamente para as trilhas prontas."
              : "Biblioteca de faixas prontas royalty-free, escolhida pelo clima (mood) de cada cena — não é gerada por IA."
          }
        >
          <select
            id="MUSIC_PROVIDER"
            value={inputs.MUSIC_PROVIDER ?? ""}
            onChange={(e) => setField("MUSIC_PROVIDER", e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Trilhas prontas (recomendado)</option>
            <option value="lyria">Gerada por IA — Lyria via OpenRouter</option>
          </select>
        </Row>
      </Section>

      <Section
        title="Créditos"
        description="1 crédito = US$ 1. Debitado do saldo quando você aprova o custo estimado de um vídeo. Sem billing real ainda — saldo ajustado manualmente aqui."
      >
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creditsBalance" className="text-sm font-medium text-neutral-200">
              Saldo
            </label>
            <input
              id="creditsBalance"
              type="number"
              min={0}
              step="0.01"
              value={creditsBalance}
              onChange={(e) => setCreditsBalance(e.target.value)}
              className="w-40 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveCredits}
            disabled={savingCredits}
            className="rounded-md border border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {savingCredits ? "Salvando..." : "Definir saldo"}
          </button>
          {creditsConsumed !== null && (
            <p className="pb-2.5 text-xs text-neutral-500">Consumido até agora: US$ {creditsConsumed.toFixed(2)}</p>
          )}
        </div>
        {creditsSaved && <p className="text-sm text-emerald-400">Saldo atualizado.</p>}
      </Section>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-neutral-100">Chaves de API</h3>
        {SECRET_FIELDS.map(({ key, label, helpUrl, usedBy }) => {
          const field = settings[key] as { set: boolean; masked?: string };
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={key} className="text-sm font-medium text-neutral-200">
                {label}
              </label>
              <input
                id={key}
                type="password"
                value={inputs[key] ?? ""}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={field.set ? `atual: ${field.masked}` : "não configurada"}
                className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
              />
              <p className="text-xs text-neutral-500">{usedBy}</p>
              <a href={helpUrl} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 underline">
                como conseguir
              </a>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-emerald-400">Salvo — próximo vídeo já usa os valores novos.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-neutral-50 px-4 py-2.5 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
