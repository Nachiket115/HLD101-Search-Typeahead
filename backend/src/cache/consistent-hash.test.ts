import { describe, expect, it } from "vitest";
import { ConsistentHashRing } from "./consistent-hash.js";

describe("ConsistentHashRing", () => {
  const keys = Array.from({ length: 5_000 }, (_, index) => `prefix-${index}`);

  it("distributes keys across all physical nodes", () => {
    const ring = new ConsistentHashRing(["redis-1", "redis-2", "redis-3"], 128);
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(ring.getNode(key), (counts.get(ring.getNode(key)) ?? 0) + 1);
    expect(counts.size).toBe(3);
    for (const count of counts.values()) expect(count / keys.length).toBeGreaterThan(0.2);
  });

  it("remaps substantially fewer keys than modulo hashing when a node is added", () => {
    const before = new ConsistentHashRing(["redis-1", "redis-2", "redis-3"], 128);
    const after = new ConsistentHashRing(["redis-1", "redis-2", "redis-3", "redis-4"], 128);
    const moved = keys.filter((key) => before.getNode(key) !== after.getNode(key)).length;
    expect(moved / keys.length).toBeLessThan(0.4);
  });
});
