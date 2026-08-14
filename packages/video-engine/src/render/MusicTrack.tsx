import type React from "react";
import { Audio } from "remotion";

const MUSIC_VOLUME = 0.15;

export const MusicTrack: React.FC<{ src: string }> = ({ src }) => (
  <Audio src={src} volume={MUSIC_VOLUME} loop />
);
