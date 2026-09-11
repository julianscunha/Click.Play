import type { VisualElement } from "@clickplay/domain";
import type { ImageProvider } from "../image/types.js";
import type { StockProvider } from "../stock/types.js";
import { resolveVideoGenerationProvider } from "../video/resolve-provider.js";
import type { VideoGenerationProvider, VideoGenerationProviderKey } from "../video/types.js";
import { StockResolutionError } from "./types.js";
import type { ResolvedElement } from "./types.js";

export interface ResolveElementContext {
  imageProvider: ImageProvider;
  videoProviders: Partial<Record<VideoGenerationProviderKey, VideoGenerationProvider>>;
  hasGoogleKey: boolean;
  hasFalKey: boolean;
  /** Tentados em ordem — se o primeiro falhar/vier vazio, tenta o próximo (sem cair pra AI). */
  stockProviders: StockProvider[];
  /** Persiste bytes gerados/baixados e devolve o caminho final (mantém fs fora da lógica pura, testável). */
  writeAsset(buffer: Buffer, filename: string): Promise<string>;
  /** Prefixo único pro arquivo desta cena/elemento (ex: `${sceneIndex}-${elementIndex}`). */
  assetId: string;
  /** Duração real da cena (segundos) — usada só por ai_video_clip, pra pedir o clipe no tamanho certo
   * em vez do default fixo de cada provider (achado real: clipe de 6s cortado/em loop feio numa cena
   * de duração diferente). Sem isso, `resolveAiVideoClip` cai no default do provider. */
  sceneDurationSeconds?: number;
  /** Aspect ratio do projeto inteiro (ex. "9:16"/"1:1"/"16:9"), de `inferAspectRatio()` — usada só por
   * ai_video_clip. Sem isso, cada provider gera no seu default (9:16), cortado feio se o projeto for
   * quadrado/horizontal (achado real: vídeo quadrado recebendo clipe vertical, cortado no meio). */
  aspectRatio?: string;
}

/** Aspect ratios que os providers de vídeo (Veo/Kling) de fato suportam — nenhum aceita proporção
 * arbitrária. Mapeia width/height pro mais próximo por proporção numérica, não string bruta de GCD
 * (que geraria valores como "2:3" pra uma resolução custom, sem suporte em nenhum provider). */
export function inferAspectRatio(width: number, height: number): "9:16" | "1:1" | "16:9" {
  const ratio = width / height;
  const candidates: ["9:16" | "1:1" | "16:9", number][] = [
    ["9:16", 9 / 16],
    ["1:1", 1],
    ["16:9", 16 / 9],
  ];
  return candidates.reduce((best, c) => (Math.abs(ratio - c[1]) < Math.abs(ratio - best[1]) ? c : best))[0];
}

/** Evita o efeito "foto vivendo" (rosto/corpo travado, câmera parada) mais comum em Veo/Kling —
 * único provider que hoje de fato usa isso é o Fal/Kling (fal.ts); OpenRouter/Gemini só logam aviso
 * e ignoram, sem quebrar nada (Veo não expõe negative prompt). */
const GENERIC_VIDEO_NEGATIVE_PROMPT =
  "static, frozen, motionless, slideshow, still photo, stiff pose, mannequin, low motion";

/** Arredonda pra CIMA pro valor suportado mais próximo — clipe mais longo que a cena só é cortado
 * (barato, `Sequence` já corta no fim); clipe mais curto vira `<Loop>` (salto visível, pior). Sem
 * duração suportada ≥ a pedida, usa a maior disponível (cena rara, mais longa que qualquer clipe). */
export function pickSupportedDuration(sceneDurationSeconds: number | undefined, supported: number[]): number | undefined {
  if (!sceneDurationSeconds || supported.length === 0) return undefined;
  const sorted = [...supported].sort((a, b) => a - b);
  return sorted.find((d) => d >= sceneDurationSeconds) ?? sorted[sorted.length - 1];
}

async function resolveStock(
  kind: "stock_image" | "stock_video",
  query: string,
  ctx: ResolveElementContext,
): Promise<ResolvedElement> {
  const attempts: { provider: string; error: string }[] = [];

  for (const provider of ctx.stockProviders) {
    try {
      const candidates =
        kind === "stock_image" ? await provider.searchImage(query) : await provider.searchVideo(query);
      const candidate = candidates[0];
      if (!candidate) {
        attempts.push({ provider: provider.id, error: "nenhum resultado" });
        continue;
      }
      const asset = await provider.download(candidate);
      return {
        type: kind,
        assetPath: asset.filePath,
        sourceDurationSeconds: asset.duration,
      };
    } catch (err) {
      attempts.push({ provider: provider.id, error: String(err) });
    }
  }

  throw new StockResolutionError(query, kind, attempts);
}

async function resolveAiVideoClip(
  element: Extract<VisualElement, { type: "ai_video_clip" }>,
  ctx: ResolveElementContext,
): Promise<ResolvedElement> {
  const providerKey = resolveVideoGenerationProvider(element.provider);
  const provider = ctx.videoProviders[providerKey];
  if (!provider) {
    throw new Error(`VideoGenerationProvider "${providerKey}" não configurado`);
  }

  const sourceImage = await ctx.imageProvider.generate(element.sourceImagePrompt ?? element.prompt);

  // Se o provider "auto"/pedido falhar em runtime (não só indisponível), tenta
  // os demais providers de vídeo configurados antes de desistir — mesma ideia
  // do fallback de stock acima, achado como necessário em teste manual real
  // (conexão instável com provider de IA derrubando o job inteiro).
  const fallbackProviders =
    element.provider === "auto"
      ? Object.entries(ctx.videoProviders).filter(([key]) => key !== providerKey)
      : [];

  const generateOpts = (p: VideoGenerationProvider) => ({
    sourceImage,
    prompt: element.prompt,
    durationSeconds: pickSupportedDuration(ctx.sceneDurationSeconds, p.supportedDurations),
    aspectRatio: ctx.aspectRatio,
    negativePrompt: GENERIC_VIDEO_NEGATIVE_PROMPT,
  });

  try {
    const result = await provider.generate(generateOpts(provider));
    return { type: "ai_video_clip", assetPath: result.filePath, sourceDurationSeconds: result.durationSeconds };
  } catch (err) {
    let lastError = err;
    for (const [key, fallbackProvider] of fallbackProviders) {
      console.warn(
        `[ai_video_clip] provider "${providerKey}" failed (${lastError instanceof Error ? lastError.message : String(lastError)}), trying "${key}"`,
      );
      try {
        const result = await fallbackProvider!.generate(generateOpts(fallbackProvider!));
        return { type: "ai_video_clip", assetPath: result.filePath, sourceDurationSeconds: result.durationSeconds };
      } catch (fallbackErr) {
        lastError = fallbackErr;
      }
    }
    throw lastError;
  }
}

/**
 * Resolve um VisualElement (prompt/spec) pro asset concreto que o renderer
 * (Fase 9) consome. Cola entre o domínio e os providers de imagem/vídeo/stock
 * (docs/IMPLEMENTATION-PLAN.md §Fase 10, 10B).
 */
export async function resolveElement(element: VisualElement, ctx: ResolveElementContext): Promise<ResolvedElement> {
  switch (element.type) {
    case "ai_image": {
      const buffer = await ctx.imageProvider.generate(element.prompt);
      const assetPath = await ctx.writeAsset(buffer, `${ctx.assetId}-ai.png`);
      return { type: "ai_image", assetPath, motion: element.motion };
    }

    case "stock_image": {
      const resolved = await resolveStock("stock_image", element.prompt, ctx);
      return { ...resolved, motion: element.motion };
    }

    case "stock_video":
      return resolveStock("stock_video", element.prompt, ctx);

    case "ai_video_clip":
      return resolveAiVideoClip(element, ctx);

    case "animated_text": {
      const randomPositions = ["top", "bottom", "center"] as const;
      const position =
        element.position === "random"
          ? randomPositions[Math.floor(Math.random() * randomPositions.length)]
          : (element.position ?? "center");
      return { type: "animated_text", text: element.text, position };
    }

    // Fora do escopo MVP (Fase 9/10) — sem provider real ainda, passa adiante
    // sem asset; o renderer já sabe desenhar um placeholder pra esses tipos.
    case "svg":
    case "shape":
    case "icon":
    case "particle_system":
    case "diagram":
    case "map":
      return { type: element.type };
  }
}
