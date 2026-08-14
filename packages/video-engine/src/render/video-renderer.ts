import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { CLICKPLAY_COMPOSITION_ID } from "./ClickPlayVideo";
import { getTotalDurationInFrames, mapRenderInputToProps } from "./project-to-props";
import type { RenderInput } from "./types";

/**
 * Contrato de export final: recebe um VideoProject com assets já resolvidos
 * (Fase 10 resolve prompt → arquivo) e produz o MP4. `RemotionRenderer` é a
 * implementação inicial (docs/IMPLEMENTATION-PLAN.md §0.2/§1).
 */
export interface VideoRenderer {
  readonly id: string;
  render(input: RenderInput, outputPath: string): Promise<{ outputPath: string; durationInFrames: number }>;
}

export interface RemotionRendererOptions {
  /** Entry point do bundle Remotion. Default: este módulo registra ClickPlayVideo via entry.tsx do app que o instancia. */
  entryPoint: string;
}

export class RemotionRenderer implements VideoRenderer {
  readonly id = "remotion";

  constructor(private readonly options: RemotionRendererOptions) {}

  async render(
    input: RenderInput,
    outputPath: string,
  ): Promise<{ outputPath: string; durationInFrames: number }> {
    const props = mapRenderInputToProps(input);
    const durationInFrames = getTotalDurationInFrames(props, input.fps);

    const bundleLocation = await bundle({ entryPoint: this.options.entryPoint });

    // inputProps do Remotion exige Record<string,unknown> — mesmo cast do OpenReelsVideo.tsx.
    const inputProps = props as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: CLICKPLAY_COMPOSITION_ID,
      inputProps,
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps: input.fps,
        width: input.width,
        height: input.height,
      },
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
    });

    return { outputPath, durationInFrames };
  }
}
