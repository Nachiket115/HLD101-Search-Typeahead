import type { QueryRecord, RankingMode, Suggestion } from "./types.js";

export interface RankingConfig {
  alpha: number;
  beta: number;
  halfLifeHours: number;
}

export function decayFactor(hours: number, halfLifeHours: number): number {
  return Math.pow(0.5, Math.max(0, hours) / halfLifeHours);
}

export function lambdaForHalfLife(halfLifeHours: number): number {
  return 1 - Math.pow(0.5, 1 / halfLifeHours);
}

export function effectiveRecency(record: QueryRecord, now: Date, halfLifeHours: number): number {
  const completedHours = Math.max(
    0,
    Math.floor((now.getTime() - record.currentHourStartedAt.getTime()) / 3_600_000)
  );
  const lambda = lambdaForHalfLife(halfLifeHours);
  if (completedHours === 0) return record.recencyEma + lambda * record.currentHourCount;
  return (
    record.recencyEma * decayFactor(completedHours, halfLifeHours) +
    lambda * record.currentHourCount * decayFactor(completedHours - 1, halfLifeHours)
  );
}

export function scoreRecord(
  record: QueryRecord,
  mode: RankingMode,
  now: Date,
  config: RankingConfig
): number {
  if (mode === "basic") return record.count;
  return config.alpha * Math.log(record.count) + config.beta * effectiveRecency(record, now, config.halfLifeHours);
}

function isBetter(a: Suggestion, b: Suggestion): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.count !== b.count) return a.count > b.count;
  return a.query.localeCompare(b.query) < 0;
}

class BoundedSuggestionHeap {
  private readonly values: Suggestion[] = [];

  constructor(private readonly capacity: number) {}

  add(value: Suggestion): void {
    if (this.values.length < this.capacity) {
      this.values.push(value);
      this.bubbleUp(this.values.length - 1);
      return;
    }
    const worst = this.values[0];
    if (worst && isBetter(value, worst)) {
      this.values[0] = value;
      this.bubbleDown(0);
    }
  }

  sorted(): Suggestion[] {
    return [...this.values].sort((a, b) => (isBetter(a, b) ? -1 : isBetter(b, a) ? 1 : 0));
  }

  private isWorse(a: Suggestion, b: Suggestion): boolean {
    return isBetter(b, a);
  }

  private bubbleUp(start: number): void {
    let index = start;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.isWorse(this.values[index]!, this.values[parent]!)) break;
      [this.values[index], this.values[parent]] = [this.values[parent]!, this.values[index]!];
      index = parent;
    }
  }

  private bubbleDown(start: number): void {
    let index = start;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let worst = index;
      if (left < this.values.length && this.isWorse(this.values[left]!, this.values[worst]!)) worst = left;
      if (right < this.values.length && this.isWorse(this.values[right]!, this.values[worst]!)) worst = right;
      if (worst === index) break;
      [this.values[index], this.values[worst]] = [this.values[worst]!, this.values[index]!];
      index = worst;
    }
  }
}

export function topSuggestions(
  records: Iterable<QueryRecord>,
  mode: RankingMode,
  now: Date,
  config: RankingConfig,
  limit = 10
): Suggestion[] {
  const top = new BoundedSuggestionHeap(limit);

  for (const record of records) {
    if (record.count < 2) continue;
    const candidate = {
      query: record.query,
      count: record.count,
      score: scoreRecord(record, mode, now, config)
    };

    top.add(candidate);
  }

  return top.sorted();
}
