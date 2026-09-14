import type { TransitionType } from "@clickplay/domain";
import { linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

// @remotion/transitions só embute fade/slide/wipe/flip/clock-wipe/iris — zoom/whip_pan/flash
// não têm presentation pronta na lib, implementadas aqui seguindo a mesma interface.

const ZoomPresentation: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const scale =
    presentationDirection === "entering"
      ? interpolate(presentationProgress, [0, 1], [1.6, 1])
      : interpolate(presentationProgress, [0, 1], [1, 0.7]);
  const opacity = presentationDirection === "exiting" ? interpolate(presentationProgress, [0, 1], [1, 0]) : 1;
  return <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>{children}</AbsoluteFill>;
};

function zoom(): TransitionPresentation<Record<string, never>> {
  return { component: ZoomPresentation, props: {} };
}

const WhipPanPresentation: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const dir = presentationDirection === "entering" ? 1 : -1;
  const translateX = interpolate(presentationProgress, [0, 1], [dir * 100, 0], { extrapolateRight: "clamp" });
  const blur = interpolate(presentationProgress, [0, 0.5, 1], [0, 20, 0]);
  return (
    <AbsoluteFill style={{ transform: `translateX(${translateX}%)`, filter: `blur(${blur}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

function whipPan(): TransitionPresentation<Record<string, never>> {
  return { component: WhipPanPresentation, props: {} };
}

const FlashPresentation: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationProgress,
}) => {
  const flashOpacity =
    presentationProgress < 0.5
      ? interpolate(presentationProgress, [0, 0.5], [0, 1])
      : interpolate(presentationProgress, [0.5, 1], [1, 0]);
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flashOpacity }} />
    </AbsoluteFill>
  );
}

function flash(): TransitionPresentation<Record<string, never>> {
  return { component: FlashPresentation, props: {} };
}

// TransitionPresentation<T> exige T extends Record<string,unknown>, mas fade()/slide()/etc
// retornam presentations tipadas com {} — mesmo unsound-cast que o OpenReels usa aqui.
export interface ResolvedTransition {
  // biome-ignore lint/suspicious/noExplicitAny: TransitionPresentation genérico não fecha com {} do fade()/slide()/etc
  presentation: any;
  timing: ReturnType<typeof linearTiming>;
}

export function getTransition(type: TransitionType, durationInFrames: number): ResolvedTransition | null {
  const timing = linearTiming({ durationInFrames });
  switch (type) {
    case "crossfade":
      return { presentation: fade(), timing };
    case "slide_left":
      return { presentation: slide({ direction: "from-right" }), timing };
    case "slide_right":
      return { presentation: slide({ direction: "from-left" }), timing };
    case "wipe":
      return { presentation: wipe({ direction: "from-left" }), timing };
    case "flip":
      return { presentation: flip(), timing };
    case "zoom":
      return { presentation: zoom(), timing };
    case "whip_pan":
      return { presentation: whipPan(), timing };
    case "flash":
      return { presentation: flash(), timing };
    case "none":
      return null;
  }
}
