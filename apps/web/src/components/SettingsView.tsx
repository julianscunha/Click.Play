import { useEffect, useState } from "react";
import { getSettings, putSettings, type Settings } from "../api.js";

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

export interface SettingsViewProps {
  onClose(): void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setInputs({ OPENROUTER_MODEL: s.OPENROUTER_MODEL, TTS_PROVIDER: s.TTS_PROVIDER });
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
      setInputs({ OPENROUTER_MODEL: fresh.OPENROUTER_MODEL, TTS_PROVIDER: fresh.TTS_PROVIDER });
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
          <label htmlFor="OPENROUTER_MODEL" className="text-sm font-medium text-neutral-200">
            Modelo (OpenRouter)
          </label>
          <input
            id="OPENROUTER_MODEL"
            value={inputs.OPENROUTER_MODEL ?? ""}
            onChange={(e) => setField("OPENROUTER_MODEL", e.target.value)}
            placeholder="openrouter/free"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
          />
          <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-xs text-neutral-500 underline">
            ver modelos disponíveis
          </a>
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
