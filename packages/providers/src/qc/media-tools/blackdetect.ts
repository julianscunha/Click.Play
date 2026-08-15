import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export interface BlackSegment {
  start: number;
  end: number;
  duration: number;
}

const BLACK_SEGMENT_RE = /black_start:(\d+\.?\d*) black_end:(\d+\.?\d*) black_duration:(\d+\.?\d*)/g;

/**
 * Segmentos pretos contínuos >= `minDurationSeconds` via filtro `blackdetect`
 * do ffmpeg — o próprio `d=` do filtro já exclui fades/transições curtas
 * (docs/IMPLEMENTATION-PLAN.md §11/Fase 12: tolerância pra abertura/encerramento
 * intencional), não precisa filtrar posição depois.
 */
export async function detectBlackSegments(filePath: string, minDurationSeconds = 1.0): Promise<BlackSegment[]> {
  let stderr: string;
  try {
    ({ stderr } = await execFileAsync(
      ffmpegPath!,
      ["-i", filePath, "-vf", `blackdetect=d=${minDurationSeconds}:pic_th=0.98`, "-an", "-f", "null", "-"],
      { maxBuffer: 10 * 1024 * 1024 },
    ));
  } catch (err) {
    const asExec = err as NodeJS.ErrnoException & { stderr?: string };
    if (typeof asExec.stderr !== "string") {
      throw new Error(`ffmpeg blackdetect falhou em "${filePath}": ${asExec.message ?? String(err)}`);
    }
    stderr = asExec.stderr;
  }

  const segments: BlackSegment[] = [];
  for (const match of stderr.matchAll(BLACK_SEGMENT_RE)) {
    segments.push({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) });
  }
  return segments;
}
