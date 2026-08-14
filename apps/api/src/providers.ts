import {
  BundledMusic,
  EdgeTTS,
  GeminiImage,
  GeminiVideo,
  FalVideo,
  OpenRouterLLM,
  PexelsStock,
  PixabayStock,
  type CostEstimateOptions,
  type ImageProvider,
  type ResolveElementContext,
  type StockProvider,
  type VideoGenerationProvider,
} from "@clickplay/providers";
import { RemotionRenderer, type VideoRenderer } from "@clickplay/video-engine";
import type { JobRunnerDeps } from "@clickplay/providers";
import * as path from "node:path";
import * as url from "node:url";

const REMOTION_ENTRY = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "remotion", "entry.tsx");

const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEY);
const hasFalKey = Boolean(process.env.FAL_API_KEY);

/** Estratégia de custo default do MVP (edge/gemini/bundled grátis-first) — ver packages/providers/src/cost/pricing.ts. */
export const costOptions: CostEstimateOptions = {
  llmModel: process.env.OPENROUTER_MODEL || "openai/gpt-4.1",
  ttsProvider: "edge",
  imageProvider: "gemini",
  videoProvider: hasGoogleKey ? "gemini" : hasFalKey ? "fal" : undefined,
  musicProvider: "bundled",
};

function buildVideoProviders(): Partial<Record<"gemini" | "fal", VideoGenerationProvider>> {
  const providers: Partial<Record<"gemini" | "fal", VideoGenerationProvider>> = {};
  if (hasGoogleKey) providers.gemini = new GeminiVideo();
  if (hasFalKey) providers.fal = new FalVideo();
  return providers;
}

/** GeminiImage lança no construtor se faltar GOOGLE_API_KEY — adia esse erro pro primeiro uso real (job), em vez de derrubar o boot do servidor pra todo mundo por falta de 1 chave. */
function buildImageProvider(): ImageProvider {
  try {
    return new GeminiImage(undefined, process.env.GOOGLE_API_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      generate: async () => {
        throw new Error(message);
      },
    };
  }
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
    hasGoogleKey,
    hasFalKey,
    stockProviders: buildStockProviders(),
  };

  const videoRenderer: VideoRenderer = new RemotionRenderer({ entryPoint: REMOTION_ENTRY });

  return {
    llm: new OpenRouterLLM(process.env.OPENROUTER_MODEL, process.env.OPENROUTER_API_KEY),
    ttsProvider: new EdgeTTS(),
    musicProvider: new BundledMusic(),
    resolveElementCtx,
    videoRenderer,
  };
}
