import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/** PCM cru (s16le, mono) -> MP3 real, via ffmpeg-static (já dependência do projeto). Usado por qualquer TTS que devolva PCM em vez de MP3 (Gemini, direto ou via OpenRouter). */
export function pcmToMp3(pcm: Buffer, sampleRate: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath!, [
      "-f",
      "s16le",
      "-ar",
      String(sampleRate),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-f",
      "mp3",
      "pipe:1",
    ]);
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`ffmpeg pcm->mp3 falhou (code ${code})`));
      else resolve(Buffer.concat(chunks));
    });
    proc.stdin.write(pcm);
    proc.stdin.end();
  });
}
