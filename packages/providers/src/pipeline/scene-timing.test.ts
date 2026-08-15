import { Scene, type WordTimestamp } from "@clickplay/domain";
import { describe, expect, it } from "vitest";
import { splitWordsIntoScenes } from "./scene-timing.js";

function scene(id: string, scriptLine: string): Scene {
  return Scene.parse({
    id,
    durationSeconds: 5,
    visualStrategy: "motion_graphics",
    elements: [{ type: "stock_image", prompt: "x" }],
    scriptLine,
    transition: null,
  });
}

function word(w: string, start: number, end: number): WordTimestamp {
  return { word: w, start, end };
}

const FPS = 30;

describe("splitWordsIntoScenes", () => {
  it("splits duration proportionally to word count when words[] covers every scene", () => {
    const scenes = [scene("1", "one two"), scene("2", "three four five")];
    const words = [
      word("one", 0, 1),
      word("two", 1, 2),
      word("three", 2, 3),
      word("four", 3, 4),
      word("five", 4, 5),
    ];
    const durations = splitWordsIntoScenes(scenes, words, FPS);
    expect(durations).toEqual([60, 90]); // 2s e 3s a 30fps
  });

  it("falls back to proportional split by script word count when words[] runs out early", () => {
    // TTS devolveu só 2 palavras (números/abreviações não bateram 1:1 com o script).
    const scenes = [scene("1", "one two"), scene("2", "three four")];
    const words = [word("one", 0, 1), word("two", 1, 4)]; // termina em 4s, cena 2 sem slice
    const durations = splitWordsIntoScenes(scenes, words, FPS);
    expect(durations[0]).toBe(120); // 4s (fim do slice da cena 1)
    // Cena 2 sem slice: proporcional (2 de 4 palavras totais) sobre os 4s totais = 2s = 60 frames.
    expect(durations[1]).toBe(60);
  });

  it("enforces a minimum of 1 frame even for a zero-duration scene", () => {
    const scenes = [scene("1", "one")];
    const durations = splitWordsIntoScenes(scenes, [], FPS);
    expect(durations).toEqual([1]);
  });
});
