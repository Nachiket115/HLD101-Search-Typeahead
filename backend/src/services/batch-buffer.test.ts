import { describe, expect, it } from "vitest";
import { BatchBuffer } from "./batch-buffer.js";

describe("BatchBuffer", () => {
  it("uses swap-then-drain without mixing new arrivals into the drained batch", () => {
    const buffer = new BatchBuffer();
    buffer.add("iphone");
    const drained = buffer.swap();
    buffer.add("ipad");
    expect([...drained.batch.entries()]).toEqual([["iphone", 1]]);
    expect(buffer.size).toBe(1);
  });

  it("merges a failed batch back into current arrivals", () => {
    const buffer = new BatchBuffer();
    buffer.add("iphone");
    const { batch } = buffer.swap();
    buffer.add("iphone");
    buffer.merge(batch);
    expect(buffer.swap().batch.get("iphone")).toBe(2);
  });
});
