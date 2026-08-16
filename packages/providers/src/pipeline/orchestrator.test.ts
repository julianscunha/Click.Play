import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderInput, VideoRenderer } from "@clickplay/video-engine";
import type { ImageProvider } from "../image/types.js";
import type { LLMProvider } from "../llm/types.js";
import type { MusicProvider } from "../music/types.js";
import type { TTSProvider } from "../tts/types.js";
import { estimateCost } from "../cost/index.js";
import { runPipeline } from "./orchestrator.js";
import type { PipelineCallbacks, PipelineOptions } from "./types.js";

const RESEARCH_RESULT = { summary: "sum", key_facts: ["fact"], mood: "curious" };

function sceneRaw(overrides: Record<string, unknown> = {}) {
  return {
    visualStrategy: "motion_graphics",
    elements: [{ type: "animated_text", text: "hello" }],
    scriptLine: "Hello world this is a test scene.",
    transition: null,
    ...overrides,
  };
}

function directorPayload(scenes: unknown[] = [sceneRaw(), sceneRaw(), sceneRaw()]) {
  return {
    emotional_arc: "curiosity-to-wonder",
    archetype: "cinematic_documentary",
    music_mood: "epic_cinematic",
    scenes,
  };
}

function critiquePayload(score: number) {
  return {
    score,
    strengths: ["ok"],
    weaknesses: [],
    revision_needed: score < 7,
    revision_instructions: score < 7 ? "tighten hook" : null,
    weakest_scene_index: null,
  };
}

function usage() {
  return { inputTokens: 10, outputTokens: 5 };
}

function fakeLLM(...responses: unknown[]): LLMProvider {
  const generate = vi.fn();
  for (const data of responses) generate.mockResolvedValueOnce({ data, usage: usage() });
  return { id: "openrouter", generate };
}

function fakeTTS(): TTSProvider {
  return {
    generate: vi.fn().mockResolvedValue({
      audio: Buffer.from("fake-audio"),
      words: [
        { word: "Hello", start: 0, end: 0.3 },
        { word: "world", start: 0.3, end: 0.6 },
      ],
    }),
  };
}

function fakeMusic(): MusicProvider {
  return { generate: vi.fn().mockResolvedValue({ filePath: "/tmp/music.mp3" }) };
}

function fakeImageProvider(): ImageProvider {
  return { generate: vi.fn().mockRejectedValue(new Error("not used in these tests")) };
}

function fakeVideoRenderer(): VideoRenderer {
  return {
    id: "fake",
    render: vi.fn(
      async (_input: RenderInput, outputPath: string) => ({ outputPath, durationInFrames: 90 }),
    ),
  };
}

function baseOptions(runDir: string, llm: LLMProvider): PipelineOptions {
  return {
    topic: "Apollo 11",
    runDir,
    llm,
    ttsProvider: fakeTTS(),
    musicProvider: fakeMusic(),
    resolveElementCtx: {
      imageProvider: fakeImageProvider(),
      videoProviders: {},
      hasGoogleKey: false,
      hasFalKey: false,
      stockProviders: [],
    },
    videoRenderer: fakeVideoRenderer(),
    cost: { llmModel: "openai/gpt-4.1", ttsProvider: "edge", imageProvider: "gemini", musicProvider: "bundled" },
  };
}

function approvingCallbacks(overrides: Partial<PipelineCallbacks> = {}): PipelineCallbacks {
  return { onCostEstimate: vi.fn().mockResolvedValue(true), ...overrides };
}

let runDir: string;

beforeEach(() => {
  runDir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-pipeline-"));
});

afterEach(() => {
  fs.rmSync(runDir, { recursive: true, force: true });
});

describe("runPipeline", () => {
  it("runs the full happy path without a revision round when the critic score is already >= 7", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const callbacks = approvingCallbacks();

    const result = await runPipeline(baseOptions(runDir, llm), callbacks);

    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("expected completed");
    expect(result.revisions).toHaveLength(1);
    expect(result.revisions[0]!.round).toBe(0);
    expect(result.outputPath).toContain("output.mp4");
    expect(fs.existsSync(path.join(runDir, "audio", "voiceover.mp3"))).toBe(true);
    expect(llm.generate).toHaveBeenCalledTimes(3);
  });

  it("revises the DirectorScore via the critic loop when score < 7, up to MAX_REVISION_ROUNDS", async () => {
    const llm = fakeLLM(
      RESEARCH_RESULT,
      directorPayload(),
      critiquePayload(4),
      directorPayload(),
      critiquePayload(9),
    );
    const revisionLog: number[] = [];
    const callbacks = approvingCallbacks({ onRevision: (entry) => void revisionLog.push(entry.round) });

    const result = await runPipeline(baseOptions(runDir, llm), callbacks);

    expect(result.status).toBe("completed");
    expect(revisionLog).toEqual([0, 1]);
    expect(llm.generate).toHaveBeenCalledTimes(5);
  });

  it("stops after MAX_REVISION_ROUNDS and proceeds with the best available score", async () => {
    const llm = fakeLLM(
      RESEARCH_RESULT,
      directorPayload(),
      critiquePayload(3),
      directorPayload(),
      critiquePayload(4),
      directorPayload(),
      critiquePayload(5),
    );
    const callbacks = approvingCallbacks();

    const result = await runPipeline(baseOptions(runDir, llm), callbacks);

    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("expected completed");
    expect(result.revisions).toHaveLength(3);
    expect(llm.generate).toHaveBeenCalledTimes(7);
  });

  it("returns cancelled_cost and skips generation when onCostEstimate rejects", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const options = baseOptions(runDir, llm);
    const callbacks = approvingCallbacks({ onCostEstimate: vi.fn().mockResolvedValue(false) });

    const result = await runPipeline(options, callbacks);

    expect(result.status).toBe("cancelled_cost");
    expect(options.ttsProvider.generate).not.toHaveBeenCalled();
    expect(options.videoRenderer.render).not.toHaveBeenCalled();
  });

  it("resumes from a checkpoint, skipping stages that were already paid for", async () => {
    const llm = fakeLLM(); // nenhuma resposta — research/director não podem ser chamados de novo
    const options = baseOptions(runDir, llm);
    const score = directorPayload();
    const resume = {
      research: { data: RESEARCH_RESULT, usage: usage() },
      director: {
        score: score as never,
        revisions: [{ round: 0, score: 8, critique: critiquePayload(8) as never }],
        costEstimate: estimateCost(score.scenes as never, options.cost),
      },
      tts: { words: [{ word: "Hello", start: 0, end: 0.3 }], voiceoverPath: "/tmp/voiceover.mp3", fullScript: "Hello world" },
    };
    options.resume = resume;
    const checkpoints: unknown[] = [];
    const callbacks = approvingCallbacks({ onCheckpoint: (cp) => void checkpoints.push(structuredClone(cp)) });

    const result = await runPipeline(options, callbacks);

    expect(result.status).toBe("completed");
    expect(llm.generate).not.toHaveBeenCalled();
    expect(options.ttsProvider.generate).not.toHaveBeenCalled();
    expect(options.videoRenderer.render).toHaveBeenCalled();
    expect(checkpoints).toHaveLength(4); // research, director, tts, visuals
    expect((checkpoints[3] as { visuals?: unknown }).visuals).toBeDefined();
  });

  it("returns a structured failed result tagged with the stage that threw", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const options = baseOptions(runDir, llm);
    options.ttsProvider.generate = vi.fn().mockRejectedValue(new Error("tts exploded"));
    const callbacks = approvingCallbacks();

    const result = await runPipeline(options, callbacks);

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("expected failed");
    expect(result.stage).toBe("tts");
    expect(result.error.message).toBe("tts exploded");
  });
});
