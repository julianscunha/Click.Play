import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type ClickPlayDb, type CostEstimateOptions, type JobRunnerDeps } from "@clickplay/providers";
import type { RenderInput, VideoRenderer } from "@clickplay/video-engine";
import type { ImageProvider, LLMProvider, MusicProvider, TTSProvider } from "@clickplay/providers";
import { buildServer } from "./server.js";

const execFileAsync = promisify(execFile);

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

function directorPayload() {
  return {
    emotional_arc: "curiosity-to-wonder",
    archetype: "cinematic_documentary",
    music_mood: "epic_cinematic",
    scenes: [sceneRaw(), sceneRaw(), sceneRaw()],
  };
}

function critiquePayload(score: number) {
  return {
    score,
    strengths: ["ok"],
    weaknesses: [],
    revision_needed: score < 7,
    revision_instructions: null,
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

const FAKE_RENDER_DURATION_FRAMES = 90;

/** Escreve um mp4 real (via ffmpeg lavfi) — QC (Fase 12) roda ffprobe/blackdetect de verdade no output. */
function fakeVideoRenderer(): VideoRenderer {
  return {
    id: "fake",
    render: vi.fn(async (input: RenderInput, outputPath: string) => {
      const durationSeconds = FAKE_RENDER_DURATION_FRAMES / input.fps;
      await execFileAsync(ffmpegPath!, [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `testsrc=size=${input.width}x${input.height}:rate=${input.fps}`,
        "-t",
        String(durationSeconds),
        "-pix_fmt",
        "yuv420p",
        outputPath,
      ]);
      return { outputPath, durationInFrames: FAKE_RENDER_DURATION_FRAMES };
    }),
  };
}

function fakeJobRunnerDeps(llm: LLMProvider): JobRunnerDeps {
  return {
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
  };
}

const costOptions: CostEstimateOptions = {
  llmModel: "openai/gpt-4.1",
  ttsProvider: "edge",
  imageProvider: "gemini",
  musicProvider: "bundled",
};

let runsDir: string;
let db: ClickPlayDb;

beforeEach(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-api-"));
  db = createDb(":memory:");
});

afterEach(() => {
  // Windows às vezes ainda segura o handle do mp4 recém-escrito pelo ffmpeg — não falhar o teste por isso.
  try {
    fs.rmSync(runsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("server", () => {
  it("responds ok on /health", async () => {
    const app = buildServer({ db, jobRunnerDeps: fakeJobRunnerDeps(fakeLLM()), costOptions, runsDir });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("lists form config and music manifest", async () => {
    const app = buildServer({ db, jobRunnerDeps: fakeJobRunnerDeps(fakeLLM()), costOptions, runsDir });

    const config = await app.inject({ method: "GET", url: "/config" });
    expect(config.statusCode).toBe(200);
    expect(config.json().archetypes).toContain("cinematic_documentary");
    expect(config.json().pacingTiers).toEqual(["fast", "moderate", "cinematic"]);

    const music = await app.inject({ method: "GET", url: "/music" });
    expect(music.statusCode).toBe(200);
    expect(Array.isArray(music.json())).toBe(true);
  });

  it("rejects POST /jobs with invalid body", async () => {
    const app = buildServer({ db, jobRunnerDeps: fakeJobRunnerDeps(fakeLLM()), costOptions, runsDir });
    const res = await app.inject({ method: "POST", url: "/jobs", payload: {} });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("404s GET /jobs/:id for an unknown job", async () => {
    const app = buildServer({ db, jobRunnerDeps: fakeJobRunnerDeps(fakeLLM()), costOptions, runsDir });
    const res = await app.inject({ method: "GET", url: "/jobs/does-not-exist" });
    expect(res.statusCode).toBe(404);
  });

  it("drives a job end to end: create → awaits cost approval → approve → completed", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const app = buildServer({ db, jobRunnerDeps: fakeJobRunnerDeps(llm), costOptions, runsDir });

    const create = await app.inject({ method: "POST", url: "/jobs", payload: { topic: "Apollo 11" } });
    expect(create.statusCode).toBe(201);
    const { id: jobId } = create.json();

    // Aguarda o pipeline (fire-and-forget) parar em AWAITING_COST_APPROVAL.
    let status = "";
    for (let i = 0; i < 50 && status !== "AWAITING_COST_APPROVAL"; i++) {
      await new Promise((r) => setTimeout(r, 10));
      const res = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
      status = res.json().status;
    }
    expect(status).toBe("AWAITING_COST_APPROVAL");

    const approve = await app.inject({
      method: "POST",
      url: `/jobs/${jobId}/approve-cost`,
      payload: { approved: true },
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().applied).toBe(true);

    // Render real via ffmpeg (QC pós-render, Fase 12) demora mais que os outros estágios — janela maior.
    for (let i = 0; i < 400 && status !== "COMPLETED" && status !== "FAILED"; i++) {
      await new Promise((r) => setTimeout(r, 20));
      const res = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
      status = res.json().status;
    }
    const final = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
    expect(final.json().status).toBe("COMPLETED");
    expect(final.json().output).toContain("/files/");

    // Idempotente: segunda chamada não reprocessa.
    const secondApprove = await app.inject({
      method: "POST",
      url: `/jobs/${jobId}/approve-cost`,
      payload: { approved: true },
    });
    expect(secondApprove.json().applied).toBe(false);
  }, 30_000);
});
