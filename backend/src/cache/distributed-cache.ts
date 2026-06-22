import { createClient } from "redis";
import { ConsistentHashRing } from "./consistent-hash.js";

type RedisConnection = ReturnType<typeof createClient>;

interface CacheNodeConfig {
  id: string;
  url: string;
}

export interface CacheRead<T> {
  nodeId: string;
  status: "hit" | "miss" | "unavailable";
  value?: T;
}

export interface CacheClient {
  get<T>(routingKey: string, cacheKey: string): Promise<CacheRead<T>>;
  set(routingKey: string, cacheKey: string, value: unknown, ttlSeconds: number): Promise<boolean>;
  owner(routingKey: string): string;
}

export class DistributedCache implements CacheClient {
  private readonly clients = new Map<string, RedisConnection>();
  private readonly ring: ConsistentHashRing;

  constructor(nodes: CacheNodeConfig[], virtualNodeCount: number) {
    this.ring = new ConsistentHashRing(nodes.map((node) => node.id), virtualNodeCount);
    for (const node of nodes) {
      const client = createClient({ url: node.url });
      client.on("error", (error) => console.error(`[cache:${node.id}]`, error.message));
      this.clients.set(node.id, client);
    }
  }

  async connect(): Promise<void> {
    await Promise.allSettled(
      [...this.clients.values()].map((client) =>
        Promise.race([
          client.connect().catch(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, 1_000))
        ])
      )
    );
  }

  async disconnect(): Promise<void> {
    await Promise.allSettled(
      [...this.clients.values()].map((client) => (client.isOpen ? client.quit() : Promise.resolve()))
    );
  }

  owner(routingKey: string): string {
    return this.ring.getNode(routingKey);
  }

  async get<T>(routingKey: string, cacheKey: string): Promise<CacheRead<T>> {
    const nodeId = this.owner(routingKey);
    const client = this.clients.get(nodeId)!;
    if (!client.isReady) return { nodeId, status: "unavailable" };
    try {
      const raw = await client.get(cacheKey);
      if (raw === null) return { nodeId, status: "miss" };
      return { nodeId, status: "hit", value: JSON.parse(raw) as T };
    } catch {
      return { nodeId, status: "unavailable" };
    }
  }

  async set(routingKey: string, cacheKey: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    const nodeId = this.owner(routingKey);
    const client = this.clients.get(nodeId)!;
    if (!client.isReady) return false;
    try {
      await client.set(cacheKey, JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch {
      return false;
    }
  }
}
