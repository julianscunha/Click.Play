import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedElement } from "../types";

/** ai_image/stock_image/stock_video (fallback estático): imagem com Ken Burns por CameraMotion.
 * `progress` usa a duração da CENA (sceneDurationInFrames), não a do vídeo inteiro — antes usava
 * useVideoConfig().durationInFrames (duração TOTAL da composição), o que deixava o zoom/pan quase
 * imperceptível em qualquer vídeo com mais de 1 cena (achado do especialista de composição/edição). */
export const ImageElement: React.FC<ResolvedElement> = ({ assetPath, motion, sceneDurationInFrames, archetypeVisuals }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: videoDurationInFrames } = useVideoConfig();
  const durationInFrames = sceneDurationInFrames ?? videoDurationInFrames;
  const progress = frame / durationInFrames;
  const intensity = archetypeVisuals?.motionIntensity ?? 1;
  const zoomRange = 0.15 * intensity;
  const panRange = 50 * intensity;

  const scale = (() => {
    switch (motion) {
      case "zoom_in":
        return interpolate(progress, [0, 1], [1, 1 + zoomRange]);
      case "zoom_out":
        return interpolate(progress, [0, 1], [1 + zoomRange, 1]);
      case "pan_left":
      case "pan_right":
        return 1 + zoomRange;
      default:
        return 1;
    }
  })();

  const translateX = (() => {
    switch (motion) {
      case "pan_right":
        return interpolate(progress, [0, 1], [0, panRange]);
      case "pan_left":
        return interpolate(progress, [0, 1], [0, -panRange]);
      default:
        return 0;
    }
  })();

  if (!assetPath) return null;

  return (
    <AbsoluteFill>
      <Img
        src={staticFile(assetPath)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
