import { TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import { CAPTION_STYLE_COMPONENTS, CAPTION_STYLE_SPRING_CONFIGS, CaptionWrapper } from "../captions/index";
import { MusicTrack } from "./MusicTrack";
import { SceneLayer } from "./SceneLayer";
import { getTransition } from "./transitions";
import type { CompositionProps } from "./types";

// Assets são copiados/symlinkados pro publicDir do bundle antes do render
// (video-renderer.ts) — aqui só chegam paths relativos a esse publicDir.
const resolveAsset = (path: string | null): string | null => (path ? staticFile(path) : null);

const Main: React.FC<CompositionProps> = ({
  scenes,
  voiceoverSrc,
  musicSrc,
  words,
  captionStyle,
  captionAccentColor,
  captionChunkSize,
  captionLingerS,
}) => {
  const StyleComponent = CAPTION_STYLE_COMPONENTS[captionStyle];
  const springConfig = CAPTION_STYLE_SPRING_CONFIGS[captionStyle];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const prevScene = i > 0 ? scenes[i - 1] : undefined;
          const trans = prevScene
            ? getTransition(prevScene.transition, prevScene.transitionDurationFrames)
            : null;

          return (
            <React.Fragment key={scene.id}>
              {trans && (
                <TransitionSeries.Transition
                  presentation={trans.presentation}
                  timing={trans.timing}
                />
              )}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
                <SceneLayer scene={scene} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Legenda no nível raiz (não dentro de cada Sequence): usa timestamps absolutos da narração inteira. */}
      {words.length > 0 && (
        <CaptionWrapper
          words={words}
          chunkSize={captionChunkSize}
          lingerS={captionLingerS}
          accentColor={captionAccentColor}
          springConfig={springConfig}
          StyleComponent={StyleComponent}
        />
      )}

      {voiceoverSrc && <Audio src={resolveAsset(voiceoverSrc)!} />}
      {musicSrc && <MusicTrack src={resolveAsset(musicSrc)!} />}
    </AbsoluteFill>
  );
};

const DEFAULT_PROPS: CompositionProps = {
  scenes: [],
  voiceoverSrc: null,
  musicSrc: null,
  words: [],
  captionStyle: "clean",
  captionAccentColor: "#38A169",
  captionChunkSize: 5,
  captionLingerS: 0.3,
};

export const CLICKPLAY_COMPOSITION_ID = "ClickPlayVideo";

// Composition exige component/defaultProps tipados como Record<string,unknown> — mesmo
// cast que o OpenReels usa em OpenReelsVideo.tsx pra manter CompositionProps tipado no Main.
export const ClickPlayVideoRoot: React.FC = () => (
  <Composition
    id={CLICKPLAY_COMPOSITION_ID}
    component={Main as unknown as React.FC<Record<string, unknown>>}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={DEFAULT_PROPS as unknown as Record<string, unknown>}
  />
);
