import { describe, expect, it } from "vitest";
import { knownUsd, unknownCost } from "../../cost/types.js";
import { checkCostDeviation } from "./cost-deviation.js";

describe("checkCostDeviation", () => {
  it("passes within 30% deviation", () => {
    expect(checkCostDeviation(knownUsd(1), knownUsd(1.2)).passed).toBe(true);
  });

  it("fails (warning) above 30% deviation", () => {
    const result = checkCostDeviation(knownUsd(1), knownUsd(1.5));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });

  it("passes (skipped) when cost is unknown", () => {
    expect(checkCostDeviation(unknownCost("no pricing"), knownUsd(1)).passed).toBe(true);
  });
});
