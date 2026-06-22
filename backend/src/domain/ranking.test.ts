import { describe, expect, it } from "vitest";
import { effectiveRecency, lambdaForHalfLife } from "./ranking.js";
import type { QueryRecord } from "./types.js";

describe("EMA recency", () => {
  it("derives lambda from a 24-hour half-life", () => {
    expect(lambdaForHalfLife(24)).toBeCloseTo(0.0285, 4);
  });

  it("decays an existing EMA by half after 24 hourly ticks", () => {
    const start = new Date("2026-06-21T00:00:00Z");
    const record: QueryRecord = {
      query: "trend",
      count: 100,
      recencyEma: 10,
      currentHourCount: 0,
      currentHourStartedAt: start
    };
    expect(effectiveRecency(record, new Date("2026-06-22T00:00:00Z"), 24)).toBeCloseTo(5, 5);
  });
});
