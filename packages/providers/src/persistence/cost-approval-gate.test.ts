import { describe, expect, it } from "vitest";
import { createCostApprovalGate } from "./cost-approval-gate.js";

describe("createCostApprovalGate", () => {
  it("resolves waitForApproval with the value passed to resolveApproval", async () => {
    const gate = createCostApprovalGate();
    const waiting = gate.waitForApproval("job-1");
    const resolved = gate.resolveApproval("job-1", true);
    expect(resolved).toBe(true);
    await expect(waiting).resolves.toBe(true);
  });

  it("is idempotent — a second resolveApproval for the same jobId is a no-op", async () => {
    const gate = createCostApprovalGate();
    const waiting = gate.waitForApproval("job-1");
    gate.resolveApproval("job-1", true);
    await waiting;

    const secondCall = gate.resolveApproval("job-1", false);
    expect(secondCall).toBe(false);
  });

  it("resolveApproval without a pending wait is a no-op", () => {
    const gate = createCostApprovalGate();
    expect(gate.resolveApproval("unknown-job", true)).toBe(false);
  });

  it("tracks multiple jobs independently", async () => {
    const gate = createCostApprovalGate();
    const waitingA = gate.waitForApproval("job-a");
    const waitingB = gate.waitForApproval("job-b");

    gate.resolveApproval("job-b", false);
    gate.resolveApproval("job-a", true);

    await expect(waitingA).resolves.toBe(true);
    await expect(waitingB).resolves.toBe(false);
  });
});
