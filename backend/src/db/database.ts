import pg from "pg";
import type { QueryRecord } from "../domain/types.js";
import { lambdaForHalfLife } from "../domain/ranking.js";

const { Pool } = pg;

interface QueryRow {
  normalized_query: string;
  search_count: string;
  recency_ema: number;
  current_hour_count: number;
  current_hour_started_at: Date;
}

function toRecord(row: QueryRow): QueryRecord {
  return {
    query: row.normalized_query,
    count: Number(row.search_count),
    recencyEma: Number(row.recency_ema),
    currentHourCount: Number(row.current_hour_count),
    currentHourStartedAt: new Date(row.current_hour_started_at)
  };
}

export class Database {
  readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
  }

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS queries (
        normalized_query VARCHAR(200) PRIMARY KEY,
        search_count BIGINT NOT NULL CHECK (search_count >= 0),
        recency_ema DOUBLE PRECISION NOT NULL DEFAULT 0,
        current_hour_count INTEGER NOT NULL DEFAULT 0 CHECK (current_hour_count >= 0),
        current_hour_started_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW()),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS queries_search_count_idx ON queries (search_count DESC);
    `);
  }

  async loadAll(): Promise<QueryRecord[]> {
    const result = await this.pool.query<QueryRow>(`
      SELECT normalized_query, search_count, recency_ema,
             current_hour_count, current_hour_started_at
      FROM queries
    `);
    return result.rows.map(toRecord);
  }

  async countQueries(): Promise<number> {
    const result = await this.pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM queries");
    return Number(result.rows[0]?.count ?? 0);
  }

  async applySearchBatch(batch: ReadonlyMap<string, number>, halfLifeHours: number): Promise<QueryRecord[]> {
    if (batch.size === 0) return [];
    const client = await this.pool.connect();
    const lambda = lambdaForHalfLife(halfLifeHours);
    const decay = 1 - lambda;
    const updated: QueryRecord[] = [];

    try {
      await client.query("BEGIN");
      for (const [query, increment] of batch) {
        const result = await client.query<QueryRow>(
          `
            INSERT INTO queries (
              normalized_query, search_count, recency_ema,
              current_hour_count, current_hour_started_at
            )
            VALUES ($1, $2, 0, $2, date_trunc('hour', NOW()))
            ON CONFLICT (normalized_query) DO UPDATE SET
              search_count = queries.search_count + EXCLUDED.search_count,
              recency_ema = CASE
                WHEN queries.current_hour_started_at = date_trunc('hour', NOW())
                  THEN queries.recency_ema
                ELSE
                  queries.recency_ema * POWER(
                    $3::double precision,
                    GREATEST(EXTRACT(EPOCH FROM (date_trunc('hour', NOW()) - queries.current_hour_started_at)) / 3600, 0)
                  )
                  + $4::double precision * queries.current_hour_count * POWER(
                    $3::double precision,
                    GREATEST(EXTRACT(EPOCH FROM (date_trunc('hour', NOW()) - queries.current_hour_started_at)) / 3600 - 1, 0)
                  )
              END,
              current_hour_count = CASE
                WHEN queries.current_hour_started_at = date_trunc('hour', NOW())
                  THEN queries.current_hour_count + EXCLUDED.current_hour_count
                ELSE EXCLUDED.current_hour_count
              END,
              current_hour_started_at = date_trunc('hour', NOW()),
              updated_at = NOW()
            RETURNING normalized_query, search_count, recency_ema,
                      current_hour_count, current_hour_started_at
          `,
          [query, increment, decay, lambda]
        );
        const row = result.rows[0];
        if (row) updated.push(toRecord(row));
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
