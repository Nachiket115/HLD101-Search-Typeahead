import { createReadStream } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { config } from "../config.js";
import { Database } from "../db/database.js";
import { normalizeQuery, validateNormalizedQuery } from "../domain/normalize.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveInputPath(input: string): Promise<string> {
  const direct = resolve(input);
  if (await pathExists(direct)) return direct;

  // npm workspaces run this script from backend/, while users run the root
  // command with paths such as data/raw. Try the repository root as well.
  const fromRepoRoot = resolve(process.cwd(), "..", input);
  if (await pathExists(fromRepoRoot)) return fromRepoRoot;

  return direct;
}

async function inputFiles(inputPath: string): Promise<string[]> {
  const details = await stat(inputPath);
  if (details.isFile()) return [inputPath];
  const entries = await readdir(inputPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && [".txt", ".tsv", ".csv"].includes(extname(entry.name).toLowerCase()))
    .map((entry) => resolve(inputPath, entry.name))
    .sort();
}

function extractQuery(line: string, fileExtension: string): { query: string; count: number } | null {
  const fields = fileExtension === ".csv" ? line.split(",") : line.split("\t");
  if (fields.length >= 2) {
    const first = fields[0]?.trim().toLowerCase();
    const second = fields[1]?.trim() ?? "";
    if (first === "anonid" || first === "query") return null;
    if (fileExtension === ".csv" && Number.isFinite(Number(second))) {
      return { query: fields[0] ?? "", count: Math.max(0, Math.floor(Number(second))) };
    }
    // AOL rows are: AnonID, Query, QueryTime, ItemRank, ClickURL.
    return { query: second, count: 1 };
  }
  return { query: line, count: 1 };
}

async function aggregate(files: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  let processed = 0;

  for (const file of files) {
    const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of lines) {
      const extracted = extractQuery(line, extname(file).toLowerCase());
      if (!extracted || extracted.count === 0) continue;
      const query = normalizeQuery(extracted.query);
      if (validateNormalizedQuery(query)) continue;
      counts.set(query, (counts.get(query) ?? 0) + extracted.count);
      processed += 1;
      if (processed % 1_000_000 === 0) console.info(`[ingest] processed ${processed.toLocaleString()} valid rows`);
    }
    console.info(`[ingest] read ${basename(file)}; ${counts.size.toLocaleString()} distinct normalized queries`);
  }
  return counts;
}

async function insertAggregates(database: Database, counts: Map<string, number>): Promise<void> {
  const client = await database.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE queries");
    const entries = [...counts.entries()];
    for (let offset = 0; offset < entries.length; offset += 1_000) {
      const chunk = entries.slice(offset, offset + 1_000);
      await client.query(
        `
          INSERT INTO queries (normalized_query, search_count)
          SELECT * FROM UNNEST($1::varchar[], $2::bigint[])
        `,
        [chunk.map(([query]) => query), chunk.map(([, count]) => count)]
      );
      if ((offset + chunk.length) % 10_000 === 0 || offset + chunk.length === entries.length) {
        console.info(`[ingest] inserted ${(offset + chunk.length).toLocaleString()} queries`);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const input = argument("--input");
if (!input) {
  console.error("Usage: npm run ingest -- --input <AOL file or directory>");
  process.exit(1);
}

const database = new Database(config.databaseUrl);
try {
  await database.migrate();
  const resolvedInput = await resolveInputPath(input);
  const files = await inputFiles(resolvedInput);
  if (files.length === 0) throw new Error("No .txt, .tsv, or .csv files found");
  const counts = await aggregate(files);
  if (counts.size < config.minDatasetRows) {
    throw new Error(
      `Only ${counts.size.toLocaleString()} distinct normalized queries found; at least ${config.minDatasetRows.toLocaleString()} are required`
    );
  }
  await insertAggregates(database, counts);
  const stored = await database.countQueries();
  console.info(`[ingest] complete: ${stored.toLocaleString()} distinct normalized queries in Postgres`);
} finally {
  await database.close();
}
