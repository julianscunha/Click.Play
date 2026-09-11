import { describe, expect, it } from "vitest";
import { friendlyError } from "./ProgressView.js";

describe("friendlyError", () => {
  it("flags a chained fallback failure blocked by an OpenRouter guardrail", () => {
    const raw =
      'Premature close → OpenRouter TTS failed (400): {"error":{"message":"...guardrail..."}} → 403 API_KEY_SERVICE_BLOCKED';
    const { title, hint } = friendlyError(raw);
    expect(title).toMatch(/Todos os providers de narração.*Guardrails/);
    expect(hint).toMatch(/guardrails/);
  });

  it("flags a chained fallback failure with no specific known cause", () => {
    const raw = "Premature close → some other unrelated error → yet another one";
    const { title } = friendlyError(raw);
    expect(title).toMatch(/Todos os providers de narração.*3 tentativas/);
  });

  it("recognizes a lone guardrail block (single provider, no chain)", () => {
    const { title } = friendlyError("blocked by guardrail: 1 endpoint excluded");
    expect(title).toMatch(/Guardrails/);
  });

  it("recognizes a lone blocked API key", () => {
    const { title } = friendlyError('{"reason":"API_KEY_SERVICE_BLOCKED","status":"PERMISSION_DENIED"}');
    expect(title).toMatch(/Chave de API bloqueada/);
  });

  it("falls back to a truncated raw message for unrecognized errors", () => {
    const { title } = friendlyError("x".repeat(300));
    expect(title.length).toBeLessThan(300);
    expect(title.endsWith("…")).toBe(true);
  });
});
