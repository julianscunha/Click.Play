import {
  BundledMusic,
  EdgeTTS,
  resolveEdgeVoice,
  FallbackLLM,
  FallbackMusic,
  FallbackTTS,
  FallbackImage,
  GeminiImage,
  GeminiTTS,
  GeminiVideo,
  FalVideo,
  OpenRouterImage,
  OpenRouterLLM,
  OpenRouterMusic,
  OpenRouterTTS,
  OpenRouterVideo,
  PexelsStock,
  PixabayStock,
  withProviderTimeout,
  type CostEstimateOptions,
  type ImageProvider,
  type LLMProvider,
  type MusicProvider,
  type ResolveElementContext,
  type StockProvider,
  type TTSProvider,
  type VideoGenerationProvider,
  MODEL_BY_TIER,
} from "@clickplay/providers";
import type { QualityTier } from "@clickplay/domain";
import { RemotionRenderer, type VideoRenderer } from "@clickplay/video-engine";
import type { JobRunnerDeps } from "@clickplay/providers";
import * as path from "node:path";
import * as url from "node:url";

const REMOTION_ENTRY = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "remotion", "entry.tsx");

/** Timeout por tipo de chamada externa — achado em teste manual real: job travou
 * 2h em 15% sem erro (fetch pendurado, nenhum provider tinha timeout). Vídeo
 * (Veo/Kling) legitimamente demora minutos pra gerar, por isso valor bem maior
 * que os outros — um timeout único pra tudo derrubaria gerações válidas de vídeo. */
const TIMEOUT_MS = {
  llm: 90_000,
  tts: 60_000,
  image: 90_000,
  video: 300_000,
  music: 120_000,
};

/** Resolve qual chave usar por provider (§11A Bloco 6, Providers): job "usar sistema" (default,
 * debita créditos) tenta a *_SYSTEM primeiro e cai pro campo sem sufixo se vazia (continuidade
 * com quem só preencheu a chave de sempre); "usar minhas chaves" usa só o campo sem sufixo. */
function resolveKey(envVar: string, useOwnProviders: boolean): string | undefined {
  if (useOwnProviders) return process.env[envVar];
  return process.env[`${envVar}_SYSTEM`] || process.env[envVar];
}

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
    musicProvider: process.env.MUSIC_PROVIDER === "lyria" ? "lyria" : "bundled",
  };
}

function buildVideoProviders(
  tier: QualityTier,
  useOwnProviders: boolean,
): Partial<Record<"gemini" | "fal" | "openrouter", VideoGenerationProvider>> {
  const googleKey = resolveKey("GOOGLE_API_KEY", useOwnProviders);
  const falKey = resolveKey("FAL_API_KEY", useOwnProviders);
  const providers: Partial<Record<"gemini" | "fal" | "openrouter", VideoGenerationProvider>> = {
    openrouter: withProviderTimeout(
      new OpenRouterVideo(process.env.VIDEO_MODEL || MODEL_BY_TIER[tier].video, resolveKey("OPENROUTER_API_KEY", useOwnProviders)),
      "video:openrouter",
      TIMEOUT_MS.video,
    ),
  };
  if (googleKey)
    providers.gemini = withProviderTimeout(new GeminiVideo(undefined, googleKey), "video:gemini", TIMEOUT_MS.video);
  if (falKey) providers.fal = withProviderTimeout(new FalVideo(undefined, falKey), "video:fal", TIMEOUT_MS.video);
  return providers;
}

/** OpenRouter é o padrão (mesma OPENROUTER_API_KEY do texto, sem exigir billing
 * no Google Cloud — achado em teste manual real: GeminiImage direto esbarra
 * em quota=0 sem billing habilitado). GeminiImage direto fica como fallback
 * quando GOOGLE_API_KEY existe. Construtor lança se faltar chave — adia esse
 * erro pro primeiro uso real (job), em vez de derrubar o boot do servidor. */
function buildImageProvider(tier: QualityTier, useOwnProviders: boolean): ImageProvider {
  try {
    const primary = withProviderTimeout(
      new OpenRouterImage(process.env.IMAGE_MODEL || MODEL_BY_TIER[tier].image, resolveKey("OPENROUTER_API_KEY", useOwnProviders)),
      "image:openrouter",
      TIMEOUT_MS.image,
    );
    const googleKey = resolveKey("GOOGLE_API_KEY", useOwnProviders);
    if (!googleKey) return primary;

    const geminiFallback = withProviderTimeout(
      new GeminiImage(undefined, googleKey),
      "image:gemini",
      TIMEOUT_MS.image,
    );
    return new FallbackImage(primary, geminiFallback);
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
function buildLLM(tier: QualityTier, useOwnProviders: boolean): LLMProvider {
  const key = resolveKey("OPENROUTER_API_KEY", useOwnProviders);
  const primary = withProviderTimeout(
    new OpenRouterLLM(process.env.OPENROUTER_MODEL || MODEL_BY_TIER[tier].llm, key),
    "llm:primary",
    TIMEOUT_MS.llm,
  );
  const fallbackModel = process.env.OPENROUTER_MODEL_FALLBACK;
  if (!fallbackModel) return primary;

  const fallback = withProviderTimeout(new OpenRouterLLM(fallbackModel, key), "llm:fallback", TIMEOUT_MS.llm);
  return new FallbackLLM(primary, fallback);
}

/** EdgeTTS (grátis, ilimitado, já tem retry+backoff próprio) continua padrão.
 * Fallback é OpenRouterTTS (mesma OPENROUTER_API_KEY já obrigatória, REST sem
 * o modo de falha do WebSocket do Edge — achado em teste manual real:
 * "Premature close"). GeminiTTS direto entra como 3º nível só se
 * GOOGLE_API_KEY existir (raramente necessário agora). */
function buildTTS(tier: QualityTier, useOwnProviders: boolean, language?: string): TTSProvider {
  const primary = withProviderTimeout(new EdgeTTS(resolveEdgeVoice(language)), "tts:edge", TIMEOUT_MS.tts);
  const openRouterFallback = withProviderTimeout(
    new OpenRouterTTS(
      process.env.TTS_MODEL_FALLBACK || MODEL_BY_TIER[tier].tts,
      undefined,
      resolveKey("OPENROUTER_API_KEY", useOwnProviders),
    ),
    "tts:openrouter",
    TIMEOUT_MS.tts,
  );

  const googleKey = resolveKey("GOOGLE_API_KEY", useOwnProviders);
  if (!googleKey) return new FallbackTTS(primary, openRouterFallback);

  const geminiFallback = withProviderTimeout(
    new GeminiTTS(undefined, undefined, googleKey),
    "tts:gemini",
    TIMEOUT_MS.tts,
  );
  return new FallbackTTS(primary, new FallbackTTS(openRouterFallback, geminiFallback));
}

/** BundledMusic (grátis, trilhas prontas) é o default e o fallback automático.
 * MUSIC_PROVIDER=lyria liga a IA generativa via OpenRouter (mesma
 * OPENROUTER_API_KEY já obrigatória, sem exigir GOOGLE_API_KEY separada —
 * ainda não validado ao vivo, ver music/openrouter.ts). */
function buildMusicProvider(useOwnProviders: boolean): MusicProvider {
  const bundled = new BundledMusic(); // arquivo local, sem chamada externa — não precisa de timeout
  if (process.env.MUSIC_PROVIDER !== "lyria") return bundled;

  const lyria = withProviderTimeout(
    new OpenRouterMusic(undefined, resolveKey("OPENROUTER_API_KEY", useOwnProviders)),
    "music:openrouter",
    TIMEOUT_MS.music,
  );
  return new FallbackMusic(lyria, bundled);
}

function buildStockProviders(): StockProvider[] {
  const providers: StockProvider[] = [];
  if (process.env.PEXELS_API_KEY) providers.push(new PexelsStock());
  if (process.env.PIXABAY_API_KEY) providers.push(new PixabayStock());
  return providers;
}

/**
 * Monta as instâncias reais de provider a partir de env vars — único lugar do
 * app que faz isso (job-runner/pipeline recebem só a interface). `tier`
 * escolhe o modelo por categoria (§11A Bloco 2 item 3, `MODEL_BY_TIER`) — env
 * var explícita sempre vence (operador sabe o que quer), tier só decide o
 * default quando a env var não foi setada.
 */
export function buildJobRunnerDeps(
  tier: QualityTier = "standard",
  language?: string,
  useOwnProviders = false,
): JobRunnerDeps {
  const resolveElementCtx: Omit<ResolveElementContext, "writeAsset" | "assetId"> = {
    imageProvider: buildImageProvider(tier, useOwnProviders),
    videoProviders: buildVideoProviders(tier, useOwnProviders),
    hasGoogleKey: Boolean(resolveKey("GOOGLE_API_KEY", useOwnProviders)),
    hasFalKey: Boolean(resolveKey("FAL_API_KEY", useOwnProviders)),
    stockProviders: buildStockProviders(),
  };

  const videoRenderer: VideoRenderer = new RemotionRenderer({ entryPoint: REMOTION_ENTRY });

  return {
    llm: buildLLM(tier, useOwnProviders),
    ttsProvider: buildTTS(tier, useOwnProviders, language),
    musicProvider: buildMusicProvider(useOwnProviders),
    resolveElementCtx,
    videoRenderer,
  };
}
