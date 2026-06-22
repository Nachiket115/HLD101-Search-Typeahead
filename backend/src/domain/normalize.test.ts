import { describe, expect, it } from "vitest";
import { normalizeQuery, validateNormalizedQuery } from "./normalize.js";

describe("normalizeQuery", () => {
  it("creates one stable identity for casing and whitespace variants", () => {
    const variants = ["  iPhone  15 ", "IPHONE 15", "iphone\t15"];
    expect(variants.map(normalizeQuery)).toEqual(["iphone 15", "iphone 15", "iphone 15"]);
  });

  it("rejects empty and over-length normalized input", () => {
    expect(validateNormalizedQuery(normalizeQuery("   "))).toBe("empty");
    expect(validateNormalizedQuery("a".repeat(201))).toBe("too_long");
  });
});
