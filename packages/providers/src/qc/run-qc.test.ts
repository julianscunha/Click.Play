import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runQc } from "./run-qc.js";

const execFileAsync = promisify(execFile);

describe("runQc", () => {
  let runDir: string;
  let mp4Path: string;

  beforeEach(async () => {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), "clickplay-qc-run-"));
    mp4Path = path.join(runDir, "output.mp4");
    await execFileAsync(ffmpegPath!, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=25",
      "-t",
      "1",
      "-pix_fmt",
      "yuv420p",
      mp4Path,
    ]);
  }, 20_000);

  afterEach(() => {
    fs.rmSync(runDir, { recursive: true, force: true });
  });

  it("PASS quando tudo bate", async () => {
    const report = await runQc({
      outputPath: mp4Path,
      expectedDurationInFrames: 25,
      fps: 25,
      width: 320,
      height: 240,
    });

    expect(report.decision).toBe("PASS");
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });

  it("BLOCK quando output não existe (nem chega a rodar os outros checks)", async () => {
    const report = await runQc({
      outputPath: path.join(runDir, "does-not-exist.mp4"),
      expectedDurationInFrames: 25,
      fps: 25,
      width: 320,
      height: 240,
    });

    expect(report.decision).toBe("BLOCK");
    expect(report.checks).toHaveLength(1);
    expect(report.checks[0]!.id).toBe("output_exists");
  });

  it("BLOCK quando resolução diverge", async () => {
    const report = await runQc({
      outputPath: mp4Path,
      expectedDurationInFrames: 25,
      fps: 25,
      width: 1920,
      height: 1080,
    });

    expect(report.decision).toBe("BLOCK");
    const resCheck = report.checks.find((c) => c.id === "resolution_match");
    expect(resCheck?.passed).toBe(false);
  });

  it("BLOCK quando duração diverge além da tolerância", async () => {
    const report = await runQc({
      outputPath: mp4Path,
      expectedDurationInFrames: 25 * 5,
      fps: 25,
      width: 320,
      height: 240,
    });

    expect(report.decision).toBe("BLOCK");
    const durCheck = report.checks.find((c) => c.id === "duration_match");
    expect(durCheck?.passed).toBe(false);
  });
});
