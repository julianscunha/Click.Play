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
  const providerKey = resolveVideoGenerationProvider(element.provider, {
    hasGoogleKey: ctx.hasGoogleKey,
    hasFalKey: ctx.hasFalKey,
  });
  const provider = ctx.videoProviders[providerKey];
  if (!provider) {
    throw new Error(`VideoGenerationProvider "${providerKey}" não configurado`);
  }

  const sourceImage = await ctx.imageProvider.generate(element.sourceImagePrompt ?? element.prompt);

  // Se o provider "auto"/pedido falhar em runtime (não só indisponível), tenta
  // o outro provider de vídeo configurado antes de desistir — mesma ideia do
  // fallback de stock acima, achado como necessário em teste manual real
  // (conexão instável com provider de IA derrubando o job inteiro).
  const otherKey = providerKey === "gemini" ? "fal" : "gemini";
  const otherProvider = element.provider === "auto" ? ctx.videoProviders[otherKey] : undefined;

  try {
    const result = await provider.generate({ sourceImage, prompt: element.prompt });
    return { type: "ai_video_clip", assetPath: result.filePath, sourceDurationSeconds: result.durationSeconds };
  } catch (err) {
    if (!otherProvider) throw err;
    console.warn(
      `[ai_video_clip] provider "${providerKey}" failed (${err instanceof Error ? err.message : String(err)}), trying "${otherKey}"`,
    );
    const result = await otherProvider.generate({ sourceImage, prompt: element.prompt });
    return { type: "ai_video_clip", assetPath: result.filePath, sourceDurationSeconds: result.durationSeconds };
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

    case "animated_text":
      return { type: "animated_text", text: element.text };

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
