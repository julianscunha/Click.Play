import {
  BundledMusic,
  EdgeTTS,
  FallbackLLM,
  FallbackTTS,
  FallbackImage,
  GeminiImage,
  GeminiTTS,
  GeminiVideo,
  FalVideo,
  OpenRouterImage,
  OpenRouterLLM,
  OpenRouterTTS,
  OpenRouterVideo,
  PexelsStock,
  PixabayStock,
  type CostEstimateOptions,
  type ImageProvider,
  type LLMProvider,
  type ResolveElementContext,
  type StockProvider,
  type TTSProvider,
  type VideoGenerationProvider,
} from "@clickplay/providers";
import { RemotionRenderer, type VideoRenderer } from "@clickplay/video-engine";
import type { JobRunnerDeps } from "@clickplay/providers";
import * as path from "node:path";
import * as url from "node:url";

const REMOTION_ENTRY = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "remotion", "entry.tsx");

/**
 * Estratégia de custo default do MVP (edge/gemini/bundled grátis-first) — ver
 * packages/providers/src/cost/pricing.ts. Função (não const) — lida por job,
 * assim a tela de settings (PUT /settings) reflete em process.env pro
 * próximo job sem exigir reiniciar a API.
 */
export function buildCostOptions(): CostEstimateOptions {
  return {
    llmModel: process.env.OPENROUTER_MODEL || "openai/gpt-4.1",
    ttsProvider: "edge",
    imageProvider: "openrouter",
    videoProvider: "openrouter",
    musicProvider: "bundled",
  };
}

function buildVideoProviders(): Partial<Record<"gemini" | "fal" | "openrouter", VideoGenerationProvider>> {
  const providers: Partial<Record<"gemini" | "fal" | "openrouter", VideoGenerationProvider>> = {
    openrouter: new OpenRouterVideo(undefined, process.env.OPENROUTER_API_KEY),
  };
  if (process.env.GOOGLE_API_KEY) providers.gemini = new GeminiVideo();
  if (process.env.FAL_API_KEY) providers.fal = new FalVideo();
  return providers;
}

/** OpenRouter é o padrão (mesma OPENROUTER_API_KEY do texto, sem exigir billing
 * no Google Cloud — achado em teste manual real: GeminiImage direto esbarra
 * em quota=0 sem billing habilitado). GeminiImage direto fica como fallback
 * quando GOOGLE_API_KEY existe. Construtor lança se faltar chave — adia esse
 * erro pro primeiro uso real (job), em vez de derrubar o boot do servidor. */
function buildImageProvider(): ImageProvider {
  try {
    const primary = new OpenRouterImage(undefined, process.env.OPENROUTER_API_KEY);
    if (!process.env.GOOGLE_API_KEY) return primary;

    return new FallbackImage(primary, new GeminiImage(undefined, process.env.GOOGLE_API_KEY));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      generate: async () => {
        throw new Error(message);
      },
    };
  }
}

/** Modelo de fallback (OPENROUTER_MODEL_FALLBACK) opcional — se setado, troca
 * pra ele quando o primário falhar (quota/erro/"No output generated", achados
 * em teste manual real). */
function buildLLM(): LLMProvider {
  const primary = new OpenRouterLLM(process.env.OPENROUTER_MODEL, process.env.OPENROUTER_API_KEY);
  const fallbackModel = process.env.OPENROUTER_MODEL_FALLBACK;
  if (!fallbackModel) return primary;

  const fallback = new OpenRouterLLM(fallbackModel, process.env.OPENROUTER_API_KEY);
  return new FallbackLLM(primary, fallback);
}

/** EdgeTTS (grátis, ilimitado, já tem retry+backoff próprio) continua padrão.
 * Fallback é OpenRouterTTS (mesma OPENROUTER_API_KEY já obrigatória, REST sem
 * o modo de falha do WebSocket do Edge — achado em teste manual real:
 * "Premature close"). GeminiTTS direto entra como 3º nível só se
 * GOOGLE_API_KEY existir (raramente necessário agora). */
function buildTTS(): TTSProvider {
  const primary = new EdgeTTS();
  const openRouterFallback = new OpenRouterTTS(undefined, undefined, process.env.OPENROUTER_API_KEY);

  if (!process.env.GOOGLE_API_KEY) return new FallbackTTS(primary, openRouterFallback);

  return new FallbackTTS(
    primary,
    new FallbackTTS(openRouterFallback, new GeminiTTS(undefined, undefined, process.env.GOOGLE_API_KEY)),
  );
}

function buildStockProviders(): StockProvider[] {
  const providers: StockProvider[] = [];
  if (process.env.PEXELS_API_KEY) providers.push(new PexelsStock());
  if (process.env.PIXABAY_API_KEY) providers.push(new PixabayStock());
  return providers;
}

/** Monta as instâncias reais de provider a partir de env vars — único lugar do app que faz isso (job-runner/pipeline recebem só a interface). */
export function buildJobRunnerDeps(): JobRunnerDeps {
  const resolveElementCtx: Omit<ResolveElementContext, "writeAsset" | "assetId"> = {
    imageProvider: buildImageProvider(),
    videoProviders: buildVideoProviders(),
    hasGoogleKey: Boolean(process.env.GOOGLE_API_KEY),
    hasFalKey: Boolean(process.env.FAL_API_KEY),
    stockProviders: buildStockProviders(),
  };

  const videoRenderer: VideoRenderer = new RemotionRenderer({ entryPoint: REMOTION_ENTRY });

  return {
    llm: buildLLM(),
    ttsProvider: buildTTS(),
    musicProvider: new BundledMusic(),
    resolveElementCtx,
    videoRenderer,
  };
}
