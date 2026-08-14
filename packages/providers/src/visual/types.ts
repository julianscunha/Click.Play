import type { CameraMotion, VisualElement } from "@clickplay/domain";

/**
 * Mesmo shape de `ResolvedElement` em `packages/video-engine/src/render/types.ts`
 * (Fase 9) — precisa ficar em sync manualmente, não é dependência de pacote
 * (providers não importa video-engine; a cola entre os dois é feita por quem
 * orquestra o pipeline, Fase 10C/apps/api).
 */
export interface ResolvedElement {
  type: VisualElement["type"];
  assetPath?: string;
  motion?: CameraMotion;
  sourceDurationSeconds?: number;
  text?: string;
}

/** Erro estruturado quando nenhum StockProvider consegue resolver um elemento. */
export class StockResolutionError extends Error {
  constructor(
    public readonly query: string,
    public readonly kind: "stock_image" | "stock_video",
    public readonly attempts: { provider: string; error: string }[],
  ) {
    super(
      `Falha ao resolver ${kind} pra query "${query}": ${attempts.map((a) => `${a.provider} (${a.error})`).join("; ")}`,
    );
    this.name = "StockResolutionError";
  }
}
