import * as fs from "node:fs";
import type { PublishInput, PublishingProvider, PublishResult } from "./types.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";
const BOUNDARY = "clickplay-youtube-upload-boundary";

/**
 * `PublishingProvider` pro YouTube (Fase 21) — sobe o MP4 via YouTube Data API v3
 * (`videos.insert`, multipart de 1 request só — não é resumable upload; ok pro tamanho
 * de vídeo deste app, single-user/self-hosted, upgrade se um dia importar arquivo grande
 * o suficiente pra falhar por timeout/conexão instável).
 *
 * Sem dependência nova: token refresh e upload são 2 chamadas `fetch` cruas (Node 22 já
 * tem `fetch` global) — `googleapis` seria overkill pra 2 endpoints.
 */
export class YouTubePublisher implements PublishingProvider {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly refreshToken: string,
  ) {}

  private async getAccessToken(): Promise<string> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`YouTube OAuth: falha ao renovar access token (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("YouTube OAuth: resposta sem access_token");
    return data.access_token;
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const accessToken = await this.getAccessToken();
    const video = fs.readFileSync(input.videoPath);

    const metadata = JSON.stringify({
      snippet: { title: input.title, description: input.description ?? "", tags: input.tags ?? [] },
      status: { privacyStatus: input.privacyStatus },
    });

    const body = Buffer.concat([
      Buffer.from(`--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${BOUNDARY}\r\nContent-Type: video/mp4\r\n\r\n`),
      video,
      Buffer.from(`\r\n--${BOUNDARY}--`),
    ]);

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${BOUNDARY}` },
      body,
    });
    if (!res.ok) throw new Error(`YouTube upload falhou (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("YouTube upload: resposta sem id do vídeo");

    return { externalUrl: `https://www.youtube.com/watch?v=${data.id}` };
  }
}
