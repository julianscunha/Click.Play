import type React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import type { ResolvedElement } from "../types";

/**
 * ai_video_clip: toca o clipe gerado por IA. Faz loop só se o clipe for mais
 * curto que a cena — clipes de IA não devem ser repetidos além disso (costura
 * visível), diferente de stock footage.
 */
export const VideoElement: React.FC<ResolvedElement> = ({ assetPath, sourceDurationSeconds }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const sceneDurationSeconds = durationInFrames / fps;

  if (!assetPath) return null;

  const needsLoop = sourceDurationSeconds != null && sourceDurationSeconds < sceneDurationSeconds;
  const loopDurationInFrames =
    sourceDurationSeconds != null ? Math.floor(sourceDurationSeconds * fps) : durationInFrames;

  const video = (
    <OffthreadVideo
      src={staticFile(assetPath)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      muted
    />
  );

  return (
    <AbsoluteFill>
      {needsLoop ? <Loop durationInFrames={loopDurationInFrames}>{video}</Loop> : video}
    </AbsoluteFill>
  );
};
