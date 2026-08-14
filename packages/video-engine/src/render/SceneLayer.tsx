import type React from "react";
import { AbsoluteFill } from "remotion";
import { ELEMENT_COMPONENTS } from "./elements/index";
import type { ResolvedScene } from "./types";

/** Empilha os elements[] de uma Scene por z-order (índice 0 = fundo), todos visíveis a cena inteira. */
export const SceneLayer: React.FC<{ scene: ResolvedScene }> = ({ scene }) => (
  <AbsoluteFill>
    {scene.elements.map((element, i) => {
      const Component = ELEMENT_COMPONENTS[element.type];
      return (
        <AbsoluteFill key={`${scene.id}-${i}`}>
          <Component {...element} />
        </AbsoluteFill>
      );
    })}
  </AbsoluteFill>
);
