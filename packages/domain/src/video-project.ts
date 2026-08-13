import { z } from "zod";
import { Scene, violatesSlideshowRule } from "./scene.js";
import { AudioTrack } from "./audio.js";
import { Caption } from "./caption.js";

export const AspectRatio = z.enum(["16:9", "9:16", "1:1"]);
export type AspectRatio = z.infer<typeof AspectRatio>;

/** Status de produção do projeto (distinto do state machine de render job, Fase 10). */
export const VideoProjectStatus = z.enum(["draft", "generating", "completed", "failed"]);
export type VideoProjectStatus = z.infer<typeof VideoProjectStatus>;

export const VideoProject = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    language: z.string().min(2),
    archetype: z.string().min(1),
    emotionalArc: z.string().min(1),
    targetDuration: z.number().positive(),
    aspectRatio: AspectRatio,
    resolution: z.object({ width: z.number().positive(), height: z.number().positive() }),
    fps: z.number().positive(),
    status: VideoProjectStatus,
    scenes: z.array(Scene).min(3).max(16),
    audio: AudioTrack,
    captions: Caption,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((project) => !violatesSlideshowRule(project.scenes), {
    message:
      'Regra anti-slideshow violada: mais de 2 cenas consecutivas com único elemento estático (ver docs/IMPLEMENTATION-PLAN.md §0.2)',
  });
export type VideoProject = z.infer<typeof VideoProject>;
