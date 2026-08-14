import { outputUrl } from "../api.js";

export interface ResultPlayerProps {
  output: string;
  onCreateAnother(): void;
}

export function ResultPlayer({ output, onCreateAnother }: ResultPlayerProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
      {/* biome-ignore lint/a11y/useMediaCaption: legendas já são queimadas no vídeo pelo renderer */}
      <video controls autoPlay className="w-full rounded-md border border-neutral-800" src={outputUrl(output)} />
      <button
        type="button"
        onClick={onCreateAnother}
        className="rounded-md border border-neutral-600 px-4 py-2 font-medium text-neutral-200 hover:bg-neutral-800"
      >
        Criar outro vídeo
      </button>
    </div>
  );
}
