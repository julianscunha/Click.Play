import { z } from "zod";

export const MusicMood = z.enum([
  "epic_cinematic",
  "tense_electronic",
  "chill_lofi",
  "uplifting_pop",
  "mysterious_ambient",
  "warm_acoustic",
  "dark_cinematic",
  "dreamy_ethereal",
  "playful_kids",
]);
export type MusicMood = z.infer<typeof MusicMood>;

export const WordTimestamp = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});
export type WordTimestamp = z.infer<typeof WordTimestamp>;

export const NarrationTrack = z.object({
  filePath: z.string().min(1),
  words: z.array(WordTimestamp),
});
export type NarrationTrack = z.infer<typeof NarrationTrack>;

export const MusicTrack = z.object({
  filePath: z.string().min(1),
  mood: MusicMood,
  durationSeconds: z.number().positive().optional(),
});
export type MusicTrack = z.infer<typeof MusicTrack>;

export const AudioTrack = z.object({
  narration: NarrationTrack.optional(),
  music: MusicTrack.optional(),
});
export type AudioTrack = z.infer<typeof AudioTrack>;
