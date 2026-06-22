import type { QueryRecord } from "./types.js";

class TrieNode {
  readonly children = new Map<string, TrieNode>();
  record?: QueryRecord;
}

export class QueryTrie {
  private readonly root = new TrieNode();
  private readonly records = new Map<string, QueryRecord>();

  insert(record: QueryRecord): void {
    const existing = this.records.get(record.query);
    if (existing) {
      Object.assign(existing, record);
      return;
    }

    this.records.set(record.query, record);
    let node = this.root;
    for (const character of record.query) {
      let child = node.children.get(character);
      if (!child) {
        child = new TrieNode();
        node.children.set(character, child);
      }
      node = child;
    }
    node.record = record;
  }

  *find(prefix: string): Iterable<QueryRecord> {
    let node = this.root;
    for (const character of prefix) {
      const child = node.children.get(character);
      if (!child) return;
      node = child;
    }
    yield* this.collect(node);
  }

  all(): Iterable<QueryRecord> {
    return this.records.values();
  }

  get(query: string): QueryRecord | undefined {
    return this.records.get(query);
  }

  get size(): number {
    return this.records.size;
  }

  private *collect(start: TrieNode): Iterable<QueryRecord> {
    const stack = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.record) yield node.record;
      for (const child of node.children.values()) stack.push(child);
    }
  }
}
