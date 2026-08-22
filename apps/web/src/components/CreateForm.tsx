import { useState } from "react";
import type { CreateJobInput, FormConfig } from "../api.js";

function formatLabel(id: string): string {
  return id.replace(/_/g, " ");
}

export interface CreateFormProps {
  config: FormConfig;
  onSubmit(input: CreateJobInput): void;
  submitting: boolean;
}

export function CreateForm({ config, onSubmit, submitting }: CreateFormProps) {
  const [topic, setTopic] = useState("");
  const [direction, setDirection] = useState("");
  const [archetype, setArchetype] = useState("");
  const [pacing, setPacing] = useState("");
  const [videoMode, setVideoMode] = useState<"motion_graphics_only" | "ai_video_only" | "hybrid">("hybrid");
  const [captionStyle, setCaptionStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"vertical" | "horizontal" | "square">("vertical");

  const canSubmit = topic.trim().length > 0 && !submitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      topic: topic.trim(),
      direction: direction.trim() || undefined,
      archetype: archetype || undefined,
      pacing: pacing || undefined,
      videoMode,
      captionStyle: captionStyle || undefined,
      aspectRatio,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="topic" className="text-sm font-medium text-neutral-200">
          Tema
        </label>
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: A história da chegada à Lua"
          required
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="direction" className="text-sm font-medium text-neutral-200">
          Briefing <span className="text-neutral-500">(opcional)</span>
        </label>
        <textarea
          id="direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="Público-alvo, tom, contexto, o que não pode faltar..."
          rows={4}
          className="resize-y rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="archetype" className="text-sm font-medium text-neutral-200">
            Arquétipo
          </label>
          <select
            id="archetype"
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
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
          <label htmlFor="pacing" className="text-sm font-medium text-neutral-200">
            Duração
          </label>
          <select
            id="pacing"
            value={pacing}
            onChange={(e) => setPacing(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
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
          <label htmlFor="captionStyle" className="text-sm font-medium text-neutral-200">
            Estilo da legenda
          </label>
          <select
            id="captionStyle"
            value={captionStyle}
            onChange={(e) => setCaptionStyle(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
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
          <label htmlFor="videoMode" className="text-sm font-medium text-neutral-200">
            Vídeo
          </label>
          <select
            id="videoMode"
            value={videoMode}
            onChange={(e) => setVideoMode(e.target.value as typeof videoMode)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
          >
            <option value="hybrid">Híbrido (imagem + vídeo onde faz sentido)</option>
            <option value="motion_graphics_only">Só imagem (mais barato)</option>
            <option value="ai_video_only">Só vídeo (mais caro)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="aspectRatio" className="text-sm font-medium text-neutral-200">
            Formato
          </label>
          <select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50 focus:border-neutral-400 focus:outline-none"
          >
            <option value="vertical">Vertical (9:16 — Reels/TikTok/Shorts)</option>
            <option value="horizontal">Horizontal (16:9 — YouTube)</option>
            <option value="square">Quadrado (1:1)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-neutral-50 px-4 py-2.5 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
      >
        {submitting ? "Criando..." : "Gerar vídeo"}
      </button>
    </form>
  );
}
