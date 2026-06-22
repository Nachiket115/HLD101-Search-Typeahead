export class BatchBuffer {
  private active = new Map<string, number>();
  private eventCount = 0;

  add(query: string): number {
    this.active.set(query, (this.active.get(query) ?? 0) + 1);
    this.eventCount += 1;
    return this.eventCount;
  }

  swap(): { batch: Map<string, number>; eventCount: number } {
    const batch = this.active;
    const eventCount = this.eventCount;
    this.active = new Map();
    this.eventCount = 0;
    return { batch, eventCount };
  }

  merge(batch: ReadonlyMap<string, number>): void {
    for (const [query, count] of batch) {
      this.active.set(query, (this.active.get(query) ?? 0) + count);
      this.eventCount += count;
    }
  }

  get size(): number {
    return this.eventCount;
  }
}
