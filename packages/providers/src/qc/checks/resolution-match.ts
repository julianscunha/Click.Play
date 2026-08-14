import type { QcCheckResult } from "../types.js";

export interface ExpectedFormat {
  width: number;
  height: number;
  fps: number;
}

export function checkResolutionMatch(expected: ExpectedFormat, actual: ExpectedFormat): QcCheckResult {
  const passed = expected.width === actual.width && expected.height === actual.height && expected.fps === actual.fps;
  return {
    id: "resolution_match",
    severity: "block",
    passed,
    message: passed
      ? `Resolução/fps do output batem (${actual.width}x${actual.height}@${actual.fps})`
      : `Resolução/fps do output (${actual.width}x${actual.height}@${actual.fps}) diverge do esperado (${expected.width}x${expected.height}@${expected.fps})`,
    details: { expected, actual },
  };
}
