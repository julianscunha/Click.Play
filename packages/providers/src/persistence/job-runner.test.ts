import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderInput, VideoRenderer } from "@clickplay/video-engine";

const execFileAsync = promisify(execFile);
import type { ImageProvider } from "../image/types.js";
import type { LLMProvider } from "../llm/types.js";
import type { MusicProvider } from "../music/types.js";
import type { TTSProvider } from "../tts/types.js";
import { createDb } from "./client.js";
import { retryJob, runJobOnce } from "./job-runner.js";
import { createJob, createProject, getJob } from "./repository.js";
import type { ProjectConfig } from "./types.js";

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

function fakeDeps(llm: LLMProvider) {
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

const config: ProjectConfig = {
  cost: { llmModel: "openai/gpt-4.1", ttsProvider: "edge", imageProvider: "gemini", musicProvider: "bundled" },
  // fps/resolução pequenos — teste gera mp4 real via ffmpeg, mantém rápido.
  fps: 25,
  width: 320,
  height: 240,
  videoMode: "motion_graphics_only", // cenas fake não têm ai_video_clip — default "hybrid" violaria o piso
};

let runDir: string;
let db: ReturnType<typeof createDb>;

beforeEach(() => {
  runDir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-job-runner-"));
  db = createDb(":memory:");
});

afterEach(() => {
  fs.rmSync(runDir, { recursive: true, force: true });
});

describe("runJobOnce", () => {
  it("drives a job QUEUED→...→COMPLETED and persists cost/output", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir });

    await runJobOnce(db, job.id, fakeDeps(llm));

    const finalJob = await getJob(db, job.id);
    expect(finalJob?.status).toBe("COMPLETED");
    expect(finalJob?.progress).toBe(1);
    expect(finalJob?.outputPath).toContain("output.mp4");
    expect(finalJob?.estimatedCost).not.toBeNull();
    expect(finalJob?.actualCost).not.toBeNull();
    // WARNING, não PASS: fakeTTS só cobre 2 das 18 palavras do script (stub
    // simples, não um TTS real) — tts_coverage pega isso corretamente.
    expect(finalJob?.qcReport?.decision).toBe("WARNING");
  }, 20_000);

  it("moves a job to CANCELLED and records the reason when approveCost rejects", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir });

    await runJobOnce(db, job.id, fakeDeps(llm), { approveCost: () => false });

    const finalJob = await getJob(db, job.id);
    expect(finalJob?.status).toBe("CANCELLED");
    expect(finalJob?.error).toMatch(/custo/);
    expect(finalJob?.estimatedCost).not.toBeNull();
  });

  it("moves a job to FAILED when QC BLOCKs (output not actually written)", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir });
    const deps = fakeDeps(llm);
    deps.videoRenderer = {
      id: "fake-broken",
      render: vi.fn(async (_input: RenderInput, outputPath: string) => ({ outputPath, durationInFrames: 90 })),
    };

    await runJobOnce(db, job.id, deps);

    const finalJob = await getJob(db, job.id);
    expect(finalJob?.status).toBe("FAILED");
    expect(finalJob?.error).toMatch(/QC reprovou/);
    expect(finalJob?.qcReport?.decision).toBe("BLOCK");
    // output_path continua persistido mesmo em BLOCK (útil pra diagnóstico).
    expect(finalJob?.outputPath).toContain("output.mp4");
  });

  it("moves a job to FAILED and records the stage+error when a stage throws", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir });
    const deps = fakeDeps(llm);
    deps.ttsProvider.generate = vi.fn().mockRejectedValue(new Error("tts exploded"));

    await runJobOnce(db, job.id, deps);

    const finalJob = await getJob(db, job.id);
    expect(finalJob?.status).toBe("FAILED");
    expect(finalJob?.error).toBe("[tts] tts exploded");
  });

  it("retryJob resumes a FAILED job from its checkpoint without re-running the LLM", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir });
    const deps = fakeDeps(llm);
    deps.ttsProvider.generate = vi.fn().mockRejectedValue(new Error("tts exploded"));

    await runJobOnce(db, job.id, deps);
    const failedJob = await getJob(db, job.id);
    expect(failedJob?.status).toBe("FAILED");
    expect(failedJob?.checkpoint?.director).toBeDefined();
    expect(failedJob?.checkpoint?.tts).toBeUndefined();

    const workingDeps = fakeDeps(llm); // mesmo mock LLM — não deve ser chamado de novo
    const retried = await retryJob(db, job.id, workingDeps);
    expect(retried).toBe(true);
    // startJob (dentro de retryJob) é fire-and-forget — espera terminar via poll no DB.
    for (let i = 0; i < 100; i++) {
      const current = await getJob(db, job.id);
      if (current?.status === "COMPLETED" || current?.status === "FAILED") break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const finalJob = await getJob(db, job.id);
    expect(finalJob?.status).toBe("COMPLETED");
    // research+director não rodaram de novo: só as 3 chamadas originais (research/director/critic).
    expect(llm.generate).toHaveBeenCalledTimes(3);
  }, 20_000);

  it("retryJob is a no-op when the job is not FAILED", async () => {
    const llm = fakeLLM(RESEARCH_RESULT, directorPayload(), critiquePayload(8));
    const project = await createProject(db, { topic: "Apollo 11", config });
    const job = await createJob(db, { projectId: project.id, runDir }); // QUEUED

    const retried = await retryJob(db, job.id, fakeDeps(llm));

    expect(retried).toBe(false);
  });
});
