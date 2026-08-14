import type { TransitionType } from "@clickplay/domain";
import { linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

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
    case "none":
      return null;
  }
}
