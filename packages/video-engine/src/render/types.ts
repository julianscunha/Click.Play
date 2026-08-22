import type { CameraMotion, CaptionStyleKey, TransitionType, VisualElement, WordTimestamp } from "@clickplay/domain";

/**
 * Input do RemotionRenderer (Fase 9): um VideoProject com todos os assets já
 * resolvidos (caminho de arquivo, não prompt). Resolver prompt → arquivo
 * (chamar ImageProvider/VideoGenerationProvider por VisualElement) é
 * orquestração da Fase 10 (job pipeline) — o renderer só desenha e exporta.
 */
export interface ResolvedElement {
  type: VisualElement["type"];
  /** Caminho de arquivo pra ai_image/stock_image/stock_video/ai_video_clip. */
  assetPath?: string;
  motion?: CameraMotion;
  /** Duração de origem em segundos, usada por ai_video_clip pra decidir loop. */
  sourceDurationSeconds?: number;
  /** Texto pra animated_text. */
  text?: string;
  /** Posição pra animated_text ("random" já resolvido pro valor concreto antes de chegar aqui). */
  position?: "top" | "bottom" | "center";
}

export interface ResolvedScene {
  id: string;
  durationInFrames: number;
  /** Camadas empilhadas por z-order (índice 0 = fundo). */
  elements: ResolvedElement[];
  transition: TransitionType;
  transitionDurationFrames: number;
}

export interface RenderInput {
  scenes: ResolvedScene[];
  fps: number;
  width: number;
  height: number;
  voiceoverPath?: string;
  musicPath?: string;
  /** Timestamps absolutos da narração inteira, pra legenda seguir a timeline global. */
  words: WordTimestamp[];
  captionStyle: CaptionStyleKey;
  captionAccentColor: string;
  captionChunkSize: number;
  captionLingerS: number;
}

/** Props que chegam de fato na composição Remotion (frames em vez de segundos). */
export interface CompositionProps {
  scenes: ResolvedScene[];
  voiceoverSrc: string | null;
  musicSrc: string | null;
  words: WordTimestamp[];
  captionStyle: CaptionStyleKey;
  captionAccentColor: string;
  captionChunkSize: number;
  captionLingerS: number;
}
