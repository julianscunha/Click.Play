import { describe, expect, it } from "vitest";
import { friendlyError } from "./ProgressView.js";

describe("friendlyError", () => {
  it("flags a chained fallback failure blocked by an OpenRouter guardrail", () => {
    const raw =
      'Premature close → OpenRouter TTS failed (400): {"error":{"message":"...guardrail..."}} → 403 API_KEY_SERVICE_BLOCKED';
    const { title, hint } = friendlyError(raw);
    expect(title).toMatch(/Todos os providers.*Guardrails/);
    expect(hint).toMatch(/guardrails/);
  });

  it("flags a chained fallback failure with no specific known cause", () => {
    const raw = "Premature close → some other unrelated error → yet another one";
    const { title } = friendlyError(raw);
    expect(title).toMatch(/Todos os providers configurados.*3 tentativas/);
  });

  it("flags a chained LLM fallback where both models reject structured output (research/director)", () => {
    const raw = "Research failed after 3 attempts: quota exceeded → [Novita] model features structured outputs not support.";
    const { title } = friendlyError(raw);
    expect(title).toMatch(/Todos os providers configurados/);
  });

  it("recognizes a lone unsupported-structured-output error (single provider, no chain)", () => {
    const { title, hint } = friendlyError("[Novita] model features structured outputs not support.");
    expect(title).toMatch(/saída estruturada/);
    expect(hint).toMatch(/OPENROUTER_MODEL/);
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
