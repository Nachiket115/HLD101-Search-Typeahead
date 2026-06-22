import { createServer } from "node:http";
import { createApp } from "./app.js";
import { DistributedCache } from "./cache/distributed-cache.js";
import { config } from "./config.js";
import { Database } from "./db/database.js";
import { QueryTrie } from "./domain/trie.js";
import { BatchWriter } from "./services/batch-writer.js";
import { Metrics } from "./services/metrics.js";
import { SuggestionService } from "./services/suggestion-service.js";

const database = new Database(config.databaseUrl);
const trie = new QueryTrie();
const metrics = new Metrics();
const cache = new DistributedCache(config.redisNodes.map((node) => ({ ...node })), config.virtualNodes);
let ready = false;

await database.migrate();
const records = await database.loadAll();
for (const record of records) trie.insert(record);
ready = records.length > 0;
await cache.connect();

const ranking = {
  alpha: config.trendingAlpha,
  beta: config.trendingBeta,
  halfLifeHours: config.trendingHalfLifeHours
};
const suggestionService = new SuggestionService(trie, cache, metrics, ranking, config.cacheTtlSeconds);
const batchWriter = new BatchWriter(database, trie, metrics, {
  intervalMs: config.batchFlushIntervalMs,
  size: config.batchSize,
  halfLifeHours: config.trendingHalfLifeHours
});
batchWriter.start();

const app = createApp({
  suggestionService,
  batchWriter,
  cache,
  metrics,
  frontendOrigin: config.frontendOrigin,
  isReady: () => ready,
  queryCount: () => trie.size
});
const server = createServer(app);
server.listen(config.port, () => {
  console.info(`[api] listening on http://localhost:${config.port}; loaded ${trie.size} queries`);
  if (!ready) console.warn("[api] dataset is empty; run the ingestion command and restart the API");
});

async function shutdown(): Promise<void> {
  ready = false;
  server.close();
  await batchWriter.stop();
  await cache.disconnect();
  await database.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
