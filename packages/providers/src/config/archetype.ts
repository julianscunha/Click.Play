import type { TransitionType } from "@clickplay/domain";

export type ScenePacing = "fast" | "moderate" | "cinematic";

/** Adaptado de OpenReels src/schema/archetype.ts (MIT). */
export interface ArchetypeConfig {
  scenePacing: ScenePacing;
  captionStyle:
    | "bold_outline"
    | "color_highlight"
    | "clean"
    | "karaoke_sweep"
    | "gradient_rise"
    | "block_impact"
    | "box_highlight";
  captionChunkSize?: number;
  captionLingerS?: number;
  colorPalette: { background: string; accent: string; text: string };
  textCardFont: string;
  motionIntensity: number;
  defaultTransition?: TransitionType;
  transitionDurationFrames?: number;
  artStyle: string;
  lighting: string;
  compositionRules: string;
  culturalMarkers: string;
  mood: string;
  antiArtifactGuidance: string;
  visualColorPalette: string[];
}
