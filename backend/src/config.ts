import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("postgresql://typeahead_user:typeahead_password@localhost:5432/typeahead"),
  REDIS_NODE_1: z.string().default("redis://localhost:6379"),
  REDIS_NODE_2: z.string().default("redis://localhost:6380"),
  REDIS_NODE_3: z.string().default("redis://localhost:6381"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  CONSISTENT_HASH_VIRTUAL_NODES: z.coerce.number().int().positive().default(128),
  BATCH_FLUSH_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  BATCH_SIZE: z.coerce.number().int().positive().default(100),
  TRENDING_ALPHA: z.coerce.number().nonnegative().default(0.7),
  TRENDING_BETA: z.coerce.number().nonnegative().default(0.3),
  TRENDING_HALF_LIFE_HOURS: z.coerce.number().positive().default(24),
  MIN_DATASET_ROWS: z.coerce.number().int().positive().default(100_000)
});

const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  redisNodes: [
    { id: "redis-1", url: env.REDIS_NODE_1 },
    { id: "redis-2", url: env.REDIS_NODE_2 },
    { id: "redis-3", url: env.REDIS_NODE_3 }
  ],
  cacheTtlSeconds: env.CACHE_TTL_SECONDS,
  virtualNodes: env.CONSISTENT_HASH_VIRTUAL_NODES,
  batchFlushIntervalMs: env.BATCH_FLUSH_INTERVAL_MS,
  batchSize: env.BATCH_SIZE,
  trendingAlpha: env.TRENDING_ALPHA,
  trendingBeta: env.TRENDING_BETA,
  trendingHalfLifeHours: env.TRENDING_HALF_LIFE_HOURS,
  minDatasetRows: env.MIN_DATASET_ROWS
} as const;
