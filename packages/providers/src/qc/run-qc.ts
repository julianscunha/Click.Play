import * as fs from "node:fs";
import { checkDurationMatch } from "./checks/duration-match.js";
import { checkOutputExists } from "./checks/output-exists.js";
import { checkResolutionMatch } from "./checks/resolution-match.js";
import { probeMedia } from "./media-tools/probe.js";
import type { QcCheckResult, QcDecision, QcReport } from "./types.js";

export interface RunQcInput {
  outputPath: string;
  /** `renderResult.durationInFrames`/fps do mesmo render — não recalculado, só verificado contra o arquivo gravado. */
  expectedDurationInFrames: number;
  fps: number;
  width: number;
  height: number;
}

function computeDecision(checks: QcCheckResult[]): QcDecision {
  if (checks.some((c) => !c.passed && c.severity === "block")) return "BLOCK";
  if (checks.some((c) => !c.passed && c.severity === "warning")) return "WARNING";
  return "PASS";
}

/**
 * QC pós-render (Fase 12). Se o output não existir, os demais checks (que
 * dependem de ler o arquivo) nem rodam — resultado já é BLOCK.
 */
export async function runQc(input: RunQcInput): Promise<QcReport> {
  const stat = fs.existsSync(input.outputPath) ? fs.statSync(input.outputPath) : null;
  const existsCheck = checkOutputExists(stat !== null, stat?.size ?? 0);

  const checks: QcCheckResult[] = [existsCheck];

  if (existsCheck.passed) {
    const probed = await probeMedia(input.outputPath);
    const expectedSeconds = input.expectedDurationInFrames / input.fps;
    checks.push(checkDurationMatch(expectedSeconds, probed.durationSeconds));
    checks.push(
      checkResolutionMatch(
        { width: input.width, height: input.height, fps: input.fps },
        { width: probed.width, height: probed.height, fps: probed.fps },
      ),
    );
  }

  return { decision: computeDecision(checks), checks, generatedAt: new Date().toISOString() };
}
