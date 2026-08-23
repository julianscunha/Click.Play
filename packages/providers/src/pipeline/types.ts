import type { CaptionStyleKey, IntroOutroConfig, QualityTier, VideoMode, WordTimestamp } from "@clickplay/domain";
import type { DirectorScore } from "../agents/creative-director.js";
import type { CritiqueResult } from "../agents/critic.js";
import type { ResearchResult } from "../agents/research.js";
import type { CostBreakdown, CostEstimateOptions } from "../cost/index.js";
import type { LLMProvider, LLMUsage } from "../llm/types.js";
import type { MusicProvider } from "../music/types.js";
import type { TTSProvider } from "../tts/types.js";
import type { ResolveElementContext } from "../visual/index.js";
import type { ResolvedScene, VideoRenderer } from "@clickplay/video-engine";

export type PipelineStage = "research" | "director" | "tts" | "visuals" | "render";

/**
 * Output de cada estágio concluído, acumulado durante o run — permite
 * retomar um job FAILED sem repetir estágios já pagos (docs/IMPLEMENTATION-PLAN.md
 * Fase 15+, retry por estágio). Assets de imagem/vídeo/áudio já ficam em disco
 * (`runDir`), o que falta persistir é o resultado estruturado de cada estágio.
 */
export interface PipelineCheckpoint {
  research?: { data: ResearchResult; usage: LLMUsage };
  director?: { score: DirectorScore; revisions: RevisionLogEntry[]; costEstimate: CostBreakdown };
  tts?: { words: WordTimestamp[]; voiceoverPath: string; fullScript: string };
  visuals?: { resolvedScenes: ResolvedScene[]; musicPath: string };
}

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
  /** Chamado com o checkpoint acumulado após cada estágio concluído (inclusive pulado por retomada) — quem chama decide persistir. */
  onCheckpoint?(checkpoint: PipelineCheckpoint): void | Promise<void>;
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
  videoMode?: VideoMode;
  /** Orça nº de cenas do Director e vira instrução no prompt (§11A Bloco 2 item 4). Sem isso, duração real é subproduto de quantas cenas o LLM decidir escrever. */
  targetDurationSeconds?: number;
  /** BCP-47 (ex. "pt-BR"/"en-US") — vira instrução de idioma no research/Director e escolhe a voz Edge TTS (§11A Bloco 3). Legenda segue o script, não precisa de campo próprio. */
  language?: string;
  /** Não usado pelo orchestrator — persistido só pra retry reconstruir os providers com o mesmo tier (§11A Bloco 2 item 3, ver buildJobRunnerDeps). */
  qualityTier?: QualityTier;
  /** Não usado pelo orchestrator — persistido só pra retry rebuildar os providers com a mesma escolha de chave (§11A Bloco 6, Providers). true = chaves próprias do usuário (Settings), sem debitar créditos; false/undefined = chaves do sistema, debita. */
  useOwnProviders?: boolean;
  direction?: string;
  /** Se false, instrui o Creative Director a não emitir elementos animated_text (§11A Bloco 4 item 7). Default true. */
  showTextOverlays?: boolean;
  /** Abertura/encerramento sintéticos (§11A Bloco 5) — Scene com animated_text + transition, prepend/append ao roteiro antes do TTS. Só modo "generated" é resolvido; "upload" fica pra Fase 15. */
  intro?: IntroOutroConfig;
  outro?: IntroOutroConfig;
  fps?: number;
  width?: number;
  height?: number;
  captionStyle?: CaptionStyleKey;
  captionAccentColor?: string;
  captionChunkSize?: number;
  captionLingerS?: number;
  transitionDurationFrames?: number;
  /** Checkpoint de um run anterior (job FAILED) — estágios presentes aqui são pulados, reusando o output já pago. */
  resume?: PipelineCheckpoint;
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
      /** Contagem final pra observabilidade (§11A Bloco 6 item 11) — dado já calculado no orchestrator pro custo real, só retornado também aqui. */
      imageCount: number;
      videoClipCount: number;
      audioSeconds: number;
    }
  | {
      status: "cancelled_cost";
      directorScore: DirectorScore;
      costEstimate: CostBreakdown;
      revisions: RevisionLogEntry[];
    }
  | { status: "cancelled" }
  | { status: "failed"; stage: PipelineStage; error: Error };
