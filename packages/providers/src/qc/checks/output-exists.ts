import type { QcCheckResult } from "../types.js";

export function checkOutputExists(exists: boolean, sizeBytes: number): QcCheckResult {
  const passed = exists && sizeBytes > 0;
  return {
    id: "output_exists",
    severity: "block",
    passed,
    message: passed
      ? `Output existe (${sizeBytes} bytes)`
      : exists
        ? "Output existe mas está vazio (0 bytes)"
        : "Output não existe",
    details: { exists, sizeBytes },
  };
}
