import type React from "react";
import { Audio } from "remotion";

export const DEFAULT_MUSIC_VOLUME = 0.15;

export const MusicTrack: React.FC<{ src: string; volume?: number }> = ({ src, volume = DEFAULT_MUSIC_VOLUME }) => (
  <Audio src={src} volume={volume} loop />
);
