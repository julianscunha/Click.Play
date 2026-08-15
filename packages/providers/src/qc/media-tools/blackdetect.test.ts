import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectBlackSegments } from "./blackdetect.js";

const execFileAsync = promisify(execFile);

describe("detectBlackSegments", () => {
  let runDir: string;

  beforeEach(() => {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), "clickplay-qc-blackdetect-"));
  });

  afterEach(() => {
    fs.rmSync(runDir, { recursive: true, force: true });
  });

  it("returns empty when there's no black segment", async () => {
    const mp4Path = path.join(runDir, "no-black.mp4");
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

    expect(await detectBlackSegments(mp4Path)).toEqual([]);
  }, 20_000);

  it("detects a black segment longer than the tolerance", async () => {
    const mp4Path = path.join(runDir, "with-black.mp4");
    await execFileAsync(ffmpegPath!, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=black:size=320x240:rate=25:duration=2",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=25:duration=1",
      "-filter_complex",
      "[0:v][1:v]concat=n=2:v=1:a=0[v]",
      "-map",
      "[v]",
      "-pix_fmt",
      "yuv420p",
      mp4Path,
    ]);

    const segments = await detectBlackSegments(mp4Path, 1.0);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0]!.duration).toBeGreaterThanOrEqual(1);
  }, 20_000);

  it("ignores a black segment shorter than the tolerance", async () => {
    const mp4Path = path.join(runDir, "short-black.mp4");
    await execFileAsync(ffmpegPath!, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=black:size=320x240:rate=25:duration=0.3",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=25:duration=1",
      "-filter_complex",
      "[0:v][1:v]concat=n=2:v=1:a=0[v]",
      "-map",
      "[v]",
      "-pix_fmt",
      "yuv420p",
      mp4Path,
    ]);

    expect(await detectBlackSegments(mp4Path, 1.0)).toEqual([]);
  }, 20_000);
});
