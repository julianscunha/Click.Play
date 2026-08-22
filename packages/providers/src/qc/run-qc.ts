import * as fs from "node:fs";
import type { CostAmount } from "../cost/types.js";
import type { RevisionLogEntry } from "../pipeline/types.js";
import { checkBlackdetect } from "./checks/blackdetect.js";
import { checkCostDeviation } from "./checks/cost-deviation.js";
import { checkCriticScore } from "./checks/critic-score.js";
import { checkDurationMatch } from "./checks/duration-match.js";
import { checkOutputExists } from "./checks/output-exists.js";
import { checkResolutionMatch } from "./checks/resolution-match.js";
import { checkTargetDurationMatch } from "./checks/target-duration-match.js";
import { checkTtsCoverage } from "./checks/tts-coverage.js";
import { detectBlackSegments } from "./media-tools/blackdetect.js";
import { probeMedia } from "./media-tools/probe.js";
import type { QcCheckResult, QcDecision, QcReport } from "./types.js";

export interface RunQcInput {
  outputPath: string;
  /** `renderResult.durationInFrames`/fps do mesmo render — não recalculado, só verificado contra o arquivo gravado. */
  expectedDurationInFrames: number;
  fps: number;
  width: number;
  height: number;
  /** Duração pedida pelo produtor (§11A Bloco 2 item 4) — se ausente, `target_duration_match` não roda. */
  targetDurationSeconds?: number;
  /** Checks WARNING — opcionais, rodam independente do output existir. */
  ttsCoverage?: { scriptWordCount: number; coveredWordCount: number };
  revisions?: RevisionLogEntry[];
  cost?: { estimated: CostAmount; actual: CostAmount };
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
    if (input.targetDurationSeconds) {
      checks.push(checkTargetDurationMatch(input.targetDurationSeconds, probed.durationSeconds));
    }
    checks.push(
      checkResolutionMatch(
        { width: input.width, height: input.height, fps: input.fps },
        { width: probed.width, height: probed.height, fps: probed.fps },
      ),
    );

    const minBlackDurationSeconds = 1.0;
    const blackSegments = await detectBlackSegments(input.outputPath, minBlackDurationSeconds);
    checks.push(checkBlackdetect(blackSegments, minBlackDurationSeconds));
  }

  if (input.ttsCoverage) {
    checks.push(checkTtsCoverage(input.ttsCoverage.scriptWordCount, input.ttsCoverage.coveredWordCount));
  }
  if (input.revisions) {
    checks.push(checkCriticScore(input.revisions));
  }
  if (input.cost) {
    checks.push(checkCostDeviation(input.cost.estimated, input.cost.actual));
  }

  return { decision: computeDecision(checks), checks, generatedAt: new Date().toISOString() };
}
