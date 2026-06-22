# Performance Report

Run measurements only after loading the actual dataset and starting all services:

```bash
mkdir -p performance/results
BENCHMARK_OUTPUT=performance/results/latest.json npm run benchmark
```

Report the measured values below; do not substitute estimates.

| Measurement | Observed value |
|---|---:|
| Distinct normalized Postgres rows | Pending measurement |
| Cold-to-warm `/suggest` p95 | Pending measurement |
| Warm-cache `/suggest` p95 | Pending measurement |
| Cache hit rate | Pending measurement |
| Search events received | Pending measurement |
| Postgres writes performed | Pending measurement |
| Write reduction | Pending measurement |

The benchmark deliberately uses repeated common prefixes mixed with occasional rare prefixes. A uniform random distribution would understate the value of a typeahead cache because almost every request would be a unique miss.
