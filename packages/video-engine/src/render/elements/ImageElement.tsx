import type React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedElement } from "../types";

/** ai_image/stock_image/stock_video (fallback estático): imagem com Ken Burns por CameraMotion. */
export const ImageElement: React.FC<ResolvedElement> = ({ assetPath, motion }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const scale = (() => {
    switch (motion) {
      case "zoom_in":
        return interpolate(progress, [0, 1], [1, 1.15]);
      case "zoom_out":
        return interpolate(progress, [0, 1], [1.15, 1]);
      case "pan_left":
      case "pan_right":
        return 1.15;
      default:
        return 1;
    }
  })();

  const translateX = (() => {
    switch (motion) {
      case "pan_right":
        return interpolate(progress, [0, 1], [0, 50]);
      case "pan_left":
        return interpolate(progress, [0, 1], [0, -50]);
      default:
        return 0;
    }
  })();

  if (!assetPath) return null;

  return (
    <AbsoluteFill>
      <Img
        src={assetPath}
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
