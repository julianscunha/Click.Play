import type { CompositionProps, RenderInput } from "./types";

/** Mapeia RenderInput (segundos/config) pra CompositionProps (o que a composição Remotion consome). */
export function mapRenderInputToProps(input: RenderInput): CompositionProps {
  return {
    scenes: input.scenes,
    voiceoverSrc: input.voiceoverPath ?? null,
    musicSrc: input.musicPath ?? null,
    words: input.words,
    captionStyle: input.captionStyle,
    captionAccentColor: input.captionAccentColor,
    captionChunkSize: input.captionChunkSize,
    captionLingerS: input.captionLingerS,
  };
}

/**
 * Duração total do vídeo em frames: soma das cenas menos overlap de transição
 * (a transição consome parte da cena anterior E da próxima simultaneamente),
 * com piso na duração da narração (a voz é a espinha dorsal da timeline).
 */
export function getTotalDurationInFrames(props: CompositionProps, fps: number): number {
  const sceneDuration = props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
  const transitionOverlap = props.scenes.reduce((sum, s, i) => {
    if (i < props.scenes.length - 1 && s.transition !== "none") {
      return sum + s.transitionDurationFrames;
    }
    return sum;
  }, 0);

  const adjusted = sceneDuration - transitionOverlap;
  const voiceoverEnd = props.words[props.words.length - 1]?.end ?? 0;
  const minFrames = Math.ceil(voiceoverEnd * fps);

  return Math.max(adjusted, minFrames);
}
