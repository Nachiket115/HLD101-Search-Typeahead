import { describe, expect, it } from "vitest";
import type { CacheClient, CacheRead } from "../cache/distributed-cache.js";
import { QueryTrie } from "../domain/trie.js";
import type { QueryRecord } from "../domain/types.js";
import { Metrics } from "./metrics.js";
import { SuggestionService } from "./suggestion-service.js";

class UnavailableCache implements CacheClient {
  owner(): string { return "redis-2"; }
  async get<T>(): Promise<CacheRead<T>> { return { nodeId: "redis-2", status: "unavailable" }; }
  async set(): Promise<boolean> { return false; }
}

describe("SuggestionService", () => {
  it("fails open to the trie when the owning Redis node is unavailable", async () => {
    const trie = new QueryTrie();
    const record: QueryRecord = {
      query: "iphone",
      count: 100,
      recencyEma: 0,
      currentHourCount: 0,
      currentHourStartedAt: new Date("2026-06-22T00:00:00Z")
    };
    trie.insert(record);
    const service = new SuggestionService(
      trie,
      new UnavailableCache(),
      new Metrics(),
      { alpha: 0.7, beta: 0.3, halfLifeHours: 24 },
      3600,
      () => new Date("2026-06-22T00:00:00Z")
    );
    const response = await service.suggest("iph", "enhanced");
    expect(response.cache).toBe("bypass");
    expect(response.suggestions[0]?.query).toBe("iphone");
  });
});
