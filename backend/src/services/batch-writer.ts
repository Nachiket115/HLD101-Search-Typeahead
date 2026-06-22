import { Database } from "../db/database.js";
import { QueryTrie } from "../domain/trie.js";
import { BatchBuffer } from "./batch-buffer.js";
import { Metrics } from "./metrics.js";

export class BatchWriter {
  private readonly buffer = new BatchBuffer();
  private timer?: NodeJS.Timeout;
  private flushPromise: Promise<void> | null = null;

  constructor(
    private readonly database: Database,
    private readonly trie: QueryTrie,
    private readonly metrics: Metrics,
    private readonly options: { intervalMs: number; size: number; halfLifeHours: number }
  ) {}

  start(): void {
    this.timer = setInterval(() => void this.flush(), this.options.intervalMs);
    this.timer.unref();
  }

  enqueue(query: string): void {
    this.metrics.increment("searchEvents");
    const size = this.buffer.add(query);
    if (size >= this.options.size) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.performFlush().finally(() => {
      this.flushPromise = null;
      if (this.buffer.size >= this.options.size) void this.flush();
    });
    return this.flushPromise;
  }

  private async performFlush(): Promise<void> {
    const { batch } = this.buffer.swap();
    if (batch.size === 0) return;
    try {
      const updated = await this.database.applySearchBatch(batch, this.options.halfLifeHours);
      for (const record of updated) this.trie.insert(record);
      this.metrics.increment("databaseWrites", batch.size);
      this.metrics.increment("batchFlushes");
      console.info(`[batch] flushed ${[...batch.values()].reduce((sum, value) => sum + value, 0)} events as ${batch.size} writes`);
    } catch (error) {
      this.buffer.merge(batch);
      this.metrics.increment("failedBatchFlushes");
      console.error("[batch] flush failed; events returned to active buffer", error);
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.flushPromise) await this.flushPromise;
    await this.flush();
  }
}
