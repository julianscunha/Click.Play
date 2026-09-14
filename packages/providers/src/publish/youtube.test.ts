import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubePublisher } from "./youtube.js";

describe("YouTubePublisher", () => {
  let videoPath: string;

  beforeEach(() => {
    videoPath = path.join(os.tmpdir(), `clickplay-yt-test-${Date.now()}.mp4`);
    fs.writeFileSync(videoPath, "fake-mp4-bytes");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(videoPath, { force: true });
  });

  it("refreshes the access token then uploads a multipart request, returning the watch URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "abc123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const publisher = new YouTubePublisher("client-id", "client-secret", "refresh-token");
    const result = await publisher.publish({
      videoPath,
      title: "Meu vídeo",
      description: "desc",
      tags: ["a", "b"],
      privacyStatus: "private",
    });

    expect(result.externalUrl).toBe("https://www.youtube.com/watch?v=abc123");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]!;
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(String(tokenInit.body)).toContain("refresh_token=refresh-token");

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1]!;
    expect(uploadUrl).toContain("uploadType=multipart");
    expect(uploadInit.headers.Authorization).toBe("Bearer tok");
    expect(uploadInit.body.toString()).toContain('"title":"Meu vídeo"');
    expect(uploadInit.body.toString()).toContain("fake-mp4-bytes");
  });

  it("throws with the response body when the token refresh fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_grant" }),
    );

    const publisher = new YouTubePublisher("client-id", "client-secret", "bad-token");
    await expect(publisher.publish({ videoPath, title: "t", privacyStatus: "private" })).rejects.toThrow(
      "invalid_grant",
    );
  });

  it("throws with the response body when the upload fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => "quota exceeded" });
    vi.stubGlobal("fetch", fetchMock);

    const publisher = new YouTubePublisher("client-id", "client-secret", "refresh-token");
    await expect(publisher.publish({ videoPath, title: "t", privacyStatus: "private" })).rejects.toThrow(
      "quota exceeded",
    );
  });
});
