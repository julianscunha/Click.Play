import type { VisualElement } from "@clickplay/domain";
import type React from "react";
import type { ResolvedElement } from "../types";
import { ImageElement } from "./ImageElement";
import { TextElement } from "./TextElement";
import { UnsupportedElement } from "./UnsupportedElement";
import { VideoElement } from "./VideoElement";

export { ImageElement, TextElement, UnsupportedElement, VideoElement };

/** Registry de tipo de VisualElement → componente de render. Escopo MVP (Fase 9). */
export const ELEMENT_COMPONENTS: Record<VisualElement["type"], React.FC<ResolvedElement>> = {
  ai_image: ImageElement,
  stock_image: ImageElement,
  // stock_video compartilha o shape de prompt+motion com ai_image/stock_image no domínio
  // (Fase 2), mas o asset resolvido é vídeo — renderiza como VideoElement, sem Ken Burns.
  stock_video: VideoElement,
  ai_video_clip: VideoElement,
  animated_text: TextElement,
  svg: UnsupportedElement,
  shape: UnsupportedElement,
  icon: UnsupportedElement,
  particle_system: UnsupportedElement,
  diagram: UnsupportedElement,
  map: UnsupportedElement,
};
