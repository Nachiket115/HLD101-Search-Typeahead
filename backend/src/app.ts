import express from "express";
import cors from "cors";
import type { CacheClient } from "./cache/distributed-cache.js";
import { normalizeQuery, validateNormalizedQuery } from "./domain/normalize.js";
import type { RankingMode } from "./domain/types.js";
import { BatchWriter } from "./services/batch-writer.js";
import { Metrics } from "./services/metrics.js";
import { SuggestionService } from "./services/suggestion-service.js";

interface AppDependencies {
  suggestionService: SuggestionService;
  batchWriter: BatchWriter;
  cache: CacheClient;
  metrics: Metrics;
  frontendOrigin: string;
  isReady: () => boolean;
  queryCount: () => number;
}

export function createApp(dependencies: AppDependencies): express.Express {
  const app = express();
  app.use(cors({ origin: dependencies.frontendOrigin }));
  app.use(express.json({ limit: "4kb" }));

  app.get("/health", (_request, response) => {
    const ready = dependencies.isReady();
    response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "loading", queries: dependencies.queryCount() });
  });

  app.get("/suggest", async (request, response, next) => {
    try {
      if (!dependencies.isReady()) {
        response.status(503).json({ error: "Suggestion index is not ready" });
        return;
      }
      const raw = typeof request.query.q === "string" ? request.query.q : "";
      const query = normalizeQuery(raw);
      const validation = validateNormalizedQuery(query);
      if (validation === "empty") {
        response.json({ query: "", mode: "enhanced", suggestions: [], cache: "bypass" });
        return;
      }
      if (validation === "too_long") {
        response.status(400).json({ error: "Query must be at most 200 characters" });
        return;
      }
      const mode: RankingMode = request.query.mode === "basic" ? "basic" : "enhanced";
      response.json(await dependencies.suggestionService.suggest(query, mode));
    } catch (error) {
      next(error);
    }
  });

  app.get("/trending", async (_request, response, next) => {
    try {
      if (!dependencies.isReady()) {
        response.status(503).json({ error: "Suggestion index is not ready" });
        return;
      }
      response.json(await dependencies.suggestionService.trending());
    } catch (error) {
      next(error);
    }
  });

  app.post("/search", (request, response) => {
    if (typeof request.body?.query !== "string") {
      response.status(400).json({ error: "query must be a string" });
      return;
    }
    const query = normalizeQuery(request.body.query);
    const validation = validateNormalizedQuery(query);
    if (validation) {
      response.status(400).json({ error: validation === "empty" ? "Query cannot be empty" : "Query must be at most 200 characters" });
      return;
    }
    dependencies.batchWriter.enqueue(query);
    response.json({ message: "Searched" });
  });

  app.get("/cache/debug", async (request, response, next) => {
    try {
      const raw = typeof request.query.prefix === "string" ? request.query.prefix : "";
      const prefix = normalizeQuery(raw);
      const validation = validateNormalizedQuery(prefix);
      if (validation) {
        response.status(400).json({ error: "A valid prefix is required" });
        return;
      }
      const mode: RankingMode = request.query.mode === "basic" ? "basic" : "enhanced";
      const cacheKey = `suggest:${mode}:${prefix}`;
      const result = await dependencies.cache.get<unknown>(prefix, cacheKey);
      response.json({ prefix, mode, cacheKey, node: result.nodeId, status: result.status });
    } catch (error) {
      next(error);
    }
  });

  app.get("/metrics", (_request, response) => response.json(dependencies.metrics.snapshot()));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}
