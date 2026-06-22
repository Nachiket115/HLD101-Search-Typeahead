export interface MetricsSnapshot {
  suggestionRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheBypasses: number;
  searchEvents: number;
  databaseWrites: number;
  batchFlushes: number;
  failedBatchFlushes: number;
}

export class Metrics {
  private values: MetricsSnapshot = {
    suggestionRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheBypasses: 0,
    searchEvents: 0,
    databaseWrites: 0,
    batchFlushes: 0,
    failedBatchFlushes: 0
  };

  increment(key: keyof MetricsSnapshot, amount = 1): void {
    this.values[key] += amount;
  }

  snapshot(): MetricsSnapshot & { cacheHitRate: number; writeReductionRatio: number } {
    const cacheAttempts = this.values.cacheHits + this.values.cacheMisses;
    return {
      ...this.values,
      cacheHitRate: cacheAttempts === 0 ? 0 : this.values.cacheHits / cacheAttempts,
      writeReductionRatio:
        this.values.searchEvents === 0 ? 0 : 1 - this.values.databaseWrites / this.values.searchEvents
    };
  }
}
