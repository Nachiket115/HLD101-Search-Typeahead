# Performance Report

Run measurements only after loading the actual dataset and starting all services:

```bash
mkdir -p performance/results
BENCHMARK_OUTPUT=performance/results/latest.json npm run benchmark
```

The latest benchmark was run after loading the AOL dataset and starting all services.

| Measurement | Observed value |
|---|---:|
| Distinct normalized Postgres rows | 1,243,881 |
| Benchmark request count | 1,000 per run |
| Cold-to-warm `/suggest` p95 | 7.04 ms |
| Cold-to-warm average `/suggest` latency | 5.80 ms |
| Warm-cache `/suggest` p95 | 3.88 ms |
| Warm-cache average `/suggest` latency | 2.15 ms |
| Cache hit rate | 97.72% |
| Suggestion requests observed by API metrics | 2,058 |
| Cache hits | 2,014 |
| Cache misses | 47 |
| Cache bypasses | 0 |
| Search events received during benchmark | 0 |
| Postgres writes performed during benchmark | 0 |
| Batch flushes during benchmark | 0 |

The benchmark deliberately uses repeated common prefixes mixed with occasional rare prefixes. A uniform random distribution would understate the value of a typeahead cache because almost every request would be a unique miss.

## Interpretation

The warm-cache p95 latency was lower than the cold-to-warm p95 latency because repeated prefixes were served from Redis instead of requiring Trie traversal. The measured cache hit rate was 97.72%, which is expected for typeahead traffic where users repeatedly request common prefixes such as `a`, `th`, `how`, and `what`.

The benchmark only exercised the suggestion read path, so search events and database writes were both zero in this run. Batch-write reduction should be demonstrated separately by submitting repeated `/search` requests and comparing `searchEvents` against `databaseWrites` from `/metrics`; the expected result is `databaseWrites` being much smaller because repeated queries are aggregated before Postgres updates.

## Latest Raw Result

```json
{
  "generatedAt": "2026-06-22T04:39:36.739Z",
  "requestCount": 1000,
  "trafficPattern": ["a", "a", "a", "th", "th", "iph", "how", "how", "what", "new", "xq"],
  "cold": {
    "label": "cold-to-warm run",
    "p95Ms": 7.04,
    "averageMs": 5.8
  },
  "warm": {
    "label": "warm-cache run",
    "p95Ms": 3.88,
    "averageMs": 2.15
  },
  "metrics": {
    "suggestionRequests": 2058,
    "cacheHits": 2014,
    "cacheMisses": 47,
    "cacheBypasses": 0,
    "searchEvents": 0,
    "databaseWrites": 0,
    "batchFlushes": 0,
    "failedBatchFlushes": 0,
    "cacheHitRate": 0.9771955361475012,
    "writeReductionRatio": 0
  }
}
```
