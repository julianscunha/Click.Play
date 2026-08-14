import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { probeMedia } from "./probe.js";

const execFileAsync = promisify(execFile);

describe("probeMedia", () => {
  let runDir: string;
  let mp4Path: string;

  beforeEach(async () => {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), "clickplay-qc-probe-"));
    mp4Path = path.join(runDir, "sample.mp4");
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

  it("extracts fps/resolution/duration/codec from a real mp4", async () => {
    const result = await probeMedia(mp4Path);

    expect(result.fps).toBe(25);
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.durationSeconds).toBeCloseTo(1, 0);
    expect(result.codec).toBe("h264");
  });

  it("throws a descriptive error for a missing file", async () => {
    await expect(probeMedia(path.join(runDir, "does-not-exist.mp4"))).rejects.toThrow(/ffprobe falhou/);
  });
});
