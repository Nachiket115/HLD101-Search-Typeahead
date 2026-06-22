import type { CacheClient } from "../cache/distributed-cache.js";
import { QueryTrie } from "../domain/trie.js";
import { topSuggestions, type RankingConfig } from "../domain/ranking.js";
import type { RankingMode, Suggestion, SuggestResponse } from "../domain/types.js";
import { Metrics } from "./metrics.js";

export class SuggestionService {
  constructor(
    private readonly trie: QueryTrie,
    private readonly cache: CacheClient,
    private readonly metrics: Metrics,
    private readonly ranking: RankingConfig,
    private readonly ttlSeconds: number,
    private readonly now: () => Date = () => new Date()
  ) {}

  async suggest(prefix: string, mode: RankingMode): Promise<SuggestResponse> {
    this.metrics.increment("suggestionRequests");
    const cacheKey = `suggest:${mode}:${prefix}`;
    const cached = await this.cache.get<Suggestion[]>(prefix, cacheKey);

    if (cached.status === "hit" && cached.value) {
      this.metrics.increment("cacheHits");
      return { query: prefix, mode, suggestions: cached.value, cache: "hit" };
    }

    if (cached.status === "miss") this.metrics.increment("cacheMisses");
    else this.metrics.increment("cacheBypasses");

    const suggestions = topSuggestions(this.trie.find(prefix), mode, this.now(), this.ranking);
    await this.cache.set(prefix, cacheKey, suggestions, this.ttlSeconds);
    return { query: prefix, mode, suggestions, cache: cached.status === "miss" ? "miss" : "bypass" };
  }

  async trending(): Promise<{ suggestions: Suggestion[]; cache: "hit" | "miss" | "bypass" }> {
    const cacheKey = "trending:global";
    const cached = await this.cache.get<Suggestion[]>(cacheKey, cacheKey);
    if (cached.status === "hit" && cached.value) {
      this.metrics.increment("cacheHits");
      return { suggestions: cached.value, cache: "hit" };
    }
    if (cached.status === "miss") this.metrics.increment("cacheMisses");
    else this.metrics.increment("cacheBypasses");
    const suggestions = topSuggestions(this.trie.all(), "enhanced", this.now(), this.ranking);
    await this.cache.set(cacheKey, cacheKey, suggestions, this.ttlSeconds);
    return { suggestions, cache: cached.status === "miss" ? "miss" : "bypass" };
  }
}
