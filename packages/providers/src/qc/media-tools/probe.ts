import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffprobeStatic from "ffprobe-static";

const execFileAsync = promisify(execFile);

export interface MediaProbeResult {
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  codec: string;
}

interface FfprobeStream {
  r_frame_rate: string;
  width: number;
  height: number;
  codec_name: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: { duration: string };
}

/** "30/1" ou "30000/1001" -> fps decimal. */
function parseFrameRate(rate: string): number {
  const [num, den] = rate.split("/").map(Number);
  return den ? num! / den : num!;
}

/**
 * Wrapper fino sobre `ffprobe` (binário do `ffprobe-static`, sem depender do
 * PATH do sistema) — só extrai dado, sem decidir PASS/WARNING/BLOCK
 * (docs/IMPLEMENTATION-PLAN.md Fase 12, checks ficam em módulos separados).
 */
export async function probeMedia(filePath: string): Promise<MediaProbeResult> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate,width,height,codec_name:format=duration",
      "-of",
      "json",
      filePath,
    ]));
  } catch (err) {
    throw new Error(`ffprobe falhou em "${filePath}": ${err instanceof Error ? err.message : String(err)}`);
  }

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const stream = parsed.streams?.[0];
  if (!stream) throw new Error(`ffprobe não encontrou stream de vídeo em "${filePath}"`);

  return {
    fps: parseFrameRate(stream.r_frame_rate),
    width: stream.width,
    height: stream.height,
    durationSeconds: Number(parsed.format.duration),
    codec: stream.codec_name,
  };
}
