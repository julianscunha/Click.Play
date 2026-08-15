import { useEffect, useState } from "react";
import { getFormConfig, getSettings, putSettings, type Settings } from "../api.js";

interface SecretFieldConfig {
  key: keyof Settings;
  label: string;
  helpUrl: string;
}

const SECRET_FIELDS: SecretFieldConfig[] = [
  { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key", helpUrl: "https://openrouter.ai/settings/keys" },
  { key: "TTS_API_KEY", label: "TTS API Key (só se o provider exigir)", helpUrl: "https://openrouter.ai/" },
  { key: "GOOGLE_API_KEY", label: "Google Gemini API Key", helpUrl: "https://aistudio.google.com/apikey" },
  { key: "FAL_API_KEY", label: "Fal.ai API Key", helpUrl: "https://fal.ai/dashboard/keys" },
  { key: "PEXELS_API_KEY", label: "Pexels API Key", helpUrl: "https://www.pexels.com/api/" },
  { key: "PIXABAY_API_KEY", label: "Pixabay API Key", helpUrl: "https://pixabay.com/api/docs/" },
];

interface ModelSelectProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  allowEmpty?: boolean;
  custom: boolean;
  onCustomChange(custom: boolean): void;
  onChange(value: string): void;
}

function ModelSelect({ id, label, value, options, allowEmpty, custom, onCustomChange, onChange }: ModelSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      {!custom ? (
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
          {allowEmpty && <option value="">Nenhum</option>}
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
      )}
    </div>
  );
}

export interface SettingsViewProps {
  onClose(): void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recommendedModels, setRecommendedModels] = useState<string[]>([]);
  const [customModel, setCustomModel] = useState(false);
  const [customFallbackModel, setCustomFallbackModel] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getSettings(), getFormConfig()])
      .then(([s, config]) => {
        setSettings(s);
        setRecommendedModels(config.recommendedModels);
        setInputs({
          OPENROUTER_MODEL: s.OPENROUTER_MODEL,
          OPENROUTER_MODEL_FALLBACK: s.OPENROUTER_MODEL_FALLBACK,
          TTS_PROVIDER: s.TTS_PROVIDER,
        });
        setCustomModel(s.OPENROUTER_MODEL !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL));
        setCustomFallbackModel(
          s.OPENROUTER_MODEL_FALLBACK !== "" && !config.recommendedModels.includes(s.OPENROUTER_MODEL_FALLBACK),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function setField(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
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
      setInputs({
        OPENROUTER_MODEL: fresh.OPENROUTER_MODEL,
        OPENROUTER_MODEL_FALLBACK: fresh.OPENROUTER_MODEL_FALLBACK,
        TTS_PROVIDER: fresh.TTS_PROVIDER,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) {
    return (
      <div className="mx-auto max-w-xl">
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
    return <p className="mx-auto max-w-xl text-sm text-neutral-400">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSave} className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-50">Configurações</h2>
        <button type="button" onClick={onClose} className="text-sm text-neutral-400 underline">
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <ModelSelect
            id="OPENROUTER_MODEL"
            label="Modelo primário (OpenRouter)"
            value={inputs.OPENROUTER_MODEL ?? ""}
            options={recommendedModels}
            custom={customModel}
            onCustomChange={setCustomModel}
            onChange={(v) => setField("OPENROUTER_MODEL", v)}
          />
          <p className="text-xs text-neutral-500">
            Sugeridos: preço conhecido e testado com saída estruturada. Modelo "preview"/experimental ou sem suporte a
            structured output pode falhar com erro genérico ("No output generated").
          </p>
          <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-xs text-neutral-500 underline">
            ver todos os modelos disponíveis
          </a>
        </div>

        <div className="flex flex-col gap-1.5">
          <ModelSelect
            id="OPENROUTER_MODEL_FALLBACK"
            label="Modelo de fallback (opcional)"
            value={inputs.OPENROUTER_MODEL_FALLBACK ?? ""}
            options={recommendedModels}
            allowEmpty
            custom={customFallbackModel}
            onCustomChange={setCustomFallbackModel}
            onChange={(v) => setField("OPENROUTER_MODEL_FALLBACK", v)}
          />
          <p className="text-xs text-neutral-500">
            Usado automaticamente se o primário falhar (quota, erro, "No output generated"). "Nenhum" desativa —
            campo vazio ao salvar não altera um fallback já configurado (limpar exige digitar outro valor por cima).
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="TTS_PROVIDER" className="text-sm font-medium text-neutral-200">
            TTS Provider
          </label>
          <input
            id="TTS_PROVIDER"
            value={inputs.TTS_PROVIDER ?? ""}
            onChange={(e) => setField("TTS_PROVIDER", e.target.value)}
            placeholder="edge"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {SECRET_FIELDS.map(({ key, label, helpUrl }) => {
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
