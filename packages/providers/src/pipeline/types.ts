import type { CaptionStyleKey } from "@clickplay/domain";
import type { DirectorScore } from "../agents/creative-director.js";
import type { CritiqueResult } from "../agents/critic.js";
import type { CostBreakdown, CostEstimateOptions } from "../cost/index.js";
import type { LLMProvider } from "../llm/types.js";
import type { MusicProvider } from "../music/types.js";
import type { TTSProvider } from "../tts/types.js";
import type { ResolveElementContext } from "../visual/index.js";
import type { VideoRenderer } from "@clickplay/video-engine";

export type PipelineStage = "research" | "director" | "tts" | "visuals" | "render";

export interface RevisionLogEntry {
  /** 0 = avaliação do DirectorScore original, antes de qualquer revisão. */
  round: number;
  score: number;
  critique: CritiqueResult;
}

export interface PipelineCallbacks {
  /** Retorno `Promise<void>` opcional — orchestrator sempre aguarda (10D persiste transição de estado antes do próximo estágio rodar). */
  onStageStart?(stage: PipelineStage): void | Promise<void>;
  onStageComplete?(stage: PipelineStage): void | Promise<void>;
  onStageError?(stage: PipelineStage, error: Error): void | Promise<void>;
  /** Orchestrator não decide política de aprovação — quem chama decide (CLI confirma, teste sempre aprova, API espera usuário). */
  onCostEstimate(estimate: CostBreakdown): Promise<boolean>;
  onRevision?(entry: RevisionLogEntry): void | Promise<void>;
  onLog?(message: string): void;
  onProgress?(fraction: number): void;
  isCancelled?(): boolean;
}

export interface PipelineOptions {
  topic: string;
  /** Todo output (assets/audio/output) grava aqui — o orchestrator não decide/hardcoda o path (10D define storage). */
  runDir: string;
  llm: LLMProvider;
  ttsProvider: TTSProvider;
  musicProvider: MusicProvider;
  /** Providers de imagem/vídeo/stock pra resolução de asset (10B) — writeAsset/assetId são preenchidos pelo orchestrator por elemento. */
  resolveElementCtx: Omit<ResolveElementContext, "writeAsset" | "assetId">;
  videoRenderer: VideoRenderer;
  cost: CostEstimateOptions;
  archetype?: string;
  pacing?: string;
  videoEnabled?: boolean;
  direction?: string;
  fps?: number;
  width?: number;
  height?: number;
  captionStyle?: CaptionStyleKey;
  captionAccentColor?: string;
  captionChunkSize?: number;
  captionLingerS?: number;
  transitionDurationFrames?: number;
}

export type PipelineResult =
  | {
      status: "completed";
      outputPath: string;
      durationInFrames: number;
      directorScore: DirectorScore;
      costEstimate: CostBreakdown;
      costActual: CostBreakdown;
      revisions: RevisionLogEntry[];
      /** Contagem de palavras do script vs `ttsResult.words.length` — pro check `tts_coverage` do QC (Fase 12), não duplicado em outro lugar. */
      scriptWordCount: number;
      coveredWordCount: number;
      /** fps/width/height efetivos do render (após aplicar default) — pro check `resolution_match` do QC. */
      fps: number;
      width: number;
      height: number;
    }
  | {
      status: "cancelled_cost";
      directorScore: DirectorScore;
      costEstimate: CostBreakdown;
      revisions: RevisionLogEntry[];
    }
  | { status: "cancelled" }
  | { status: "failed"; stage: PipelineStage; error: Error };
