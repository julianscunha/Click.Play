import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/** PCM cru (s16le, mono) -> MP3 real, via ffmpeg-static (já dependência do projeto). Usado por qualquer TTS que devolva PCM em vez de MP3 (Gemini, direto ou via OpenRouter).
 * bitrate default 64k: folga sobre os 48kbps do Edge TTS (AUDIO_24KHZ_48KBITRATE_MONO_MP3),
 * ainda bem mais magro que o default do libmp3lame sem `-b:a` (achado do especialista de
 * render/encoding — voz mono fala perfeitamente bem nessa faixa). */
export function pcmToMp3(pcm: Buffer, sampleRate: number, bitrate = "64k"): Promise<Buffer> {
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
      "-b:a",
      bitrate,
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
