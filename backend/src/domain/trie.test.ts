import { describe, expect, it } from "vitest";
import { topSuggestions } from "./ranking.js";
import { QueryTrie } from "./trie.js";
import type { QueryRecord } from "./types.js";

const at = new Date("2026-06-22T00:00:00Z");
const record = (query: string, count: number): QueryRecord => ({
  query,
  count,
  recencyEma: 0,
  currentHourCount: 0,
  currentHourStartedAt: at
});

describe("QueryTrie", () => {
  it("returns only descendants of the requested prefix in ranked order", () => {
    const trie = new QueryTrie();
    trie.insert(record("iphone", 100));
    trie.insert(record("iphone charger", 200));
    trie.insert(record("ipad", 300));
    const result = topSuggestions(trie.find("iph"), "basic", at, { alpha: 0.7, beta: 0.3, halfLifeHours: 24 });
    expect(result.map((item) => item.query)).toEqual(["iphone charger", "iphone"]);
  });

  it("updates shared records incrementally and enforces the count-two floor", () => {
    const trie = new QueryTrie();
    trie.insert(record("new query", 1));
    expect(topSuggestions(trie.find("new"), "basic", at, { alpha: 0.7, beta: 0.3, halfLifeHours: 24 })).toEqual([]);
    trie.insert(record("new query", 2));
    expect(topSuggestions(trie.find("new"), "basic", at, { alpha: 0.7, beta: 0.3, halfLifeHours: 24 })).toHaveLength(1);
  });
});
