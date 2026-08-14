import type React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedElement } from "../types";

/** animated_text: título/texto de cena, com entrada por spring. Não confundir com legenda (Fase 8). */
export const TextElement: React.FC<ResolvedElement> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scaleIn = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });

  if (!text) return null;

  return (
    <AbsoluteFill
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px" }}
    >
      <div
        style={{
          transform: `scale(${scaleIn})`,
          textAlign: "center",
          color: "#FFFFFF",
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1.2,
          textShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
