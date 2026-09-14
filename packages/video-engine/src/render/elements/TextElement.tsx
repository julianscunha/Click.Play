import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TEXT_CARD_FONTS } from "../../captions/fonts";
import type { ResolvedElement } from "../types";

const JUSTIFY_BY_POSITION: Record<NonNullable<ResolvedElement["position"]>, string> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

const EXIT_SECONDS = 0.35;

/** 1 (totalmente visível) até framesToEnd cair abaixo de exitFrames, daí encolhe linear até 0
 * nos últimos frames da cena. Extraída como função pura só por ter mordido uma vez: Remotion
 * `interpolate()` exige inputRange estritamente crescente — passar [exitFrames, 0] (decrescente)
 * quebra em runtime com "inputRange must be strictly monotonically increasing" (achado em
 * validação visual real, não pego pelos testes existentes por não haver nenhum pra este arquivo). */
export function computeExitProgress(framesToEnd: number, exitFrames: number): number {
  if (framesToEnd >= exitFrames) return 1;
  return interpolate(framesToEnd, [0, exitFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** animated_text: título/texto de cena, com entrada por spring e saída (encolhe+desvanece) nos
 * últimos EXIT_SECONDS da cena. Tipografia/cor vêm do arquétipo quando disponíveis (antes eram
 * fixas — branco/72px — pros 19 arquétipos, achado do especialista de composição/edição).
 * Não confundir com legenda (Fase 8). */
export const TextElement: React.FC<ResolvedElement> = ({
  text,
  position = "center",
  sceneDurationInFrames,
  archetypeVisuals,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scaleIn = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });

  const exitFrames = Math.round(fps * EXIT_SECONDS);
  const framesToEnd = sceneDurationInFrames !== undefined ? sceneDurationInFrames - frame : Infinity;
  const exitProgress = computeExitProgress(framesToEnd, exitFrames);

  if (!text) return null;

  const fontFamily = archetypeVisuals?.textCardFont ? TEXT_CARD_FONTS[archetypeVisuals.textCardFont] : undefined;
  const textColor = archetypeVisuals?.colorPalette.text ?? "#FFFFFF";

  return (
    <AbsoluteFill
      style={{ display: "flex", alignItems: "center", justifyContent: JUSTIFY_BY_POSITION[position], padding: "80px" }}
    >
      <div
        style={{
          transform: `scale(${scaleIn * exitProgress})`,
          opacity: exitProgress,
          textAlign: "center",
          color: textColor,
          fontFamily,
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
