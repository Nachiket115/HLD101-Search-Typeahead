import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.API_URL ?? "http://localhost:3000";
const requestCount = Number(process.env.BENCHMARK_REQUESTS ?? 1_000);
const prefixes = ["a", "a", "a", "th", "th", "iph", "how", "how", "what", "new", "xq"];

async function run(label: string): Promise<{ label: string; p95Ms: number; averageMs: number }> {
  const durations: number[] = [];
  for (let index = 0; index < requestCount; index += 1) {
    const prefix = prefixes[index % prefixes.length]!;
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}/suggest?q=${encodeURIComponent(prefix)}`);
    if (!response.ok) throw new Error(`Benchmark request failed with ${response.status}`);
    await response.json();
    durations.push(performance.now() - startedAt);
  }
  durations.sort((a, b) => a - b);
  return {
    label,
    p95Ms: Number(durations[Math.floor(durations.length * 0.95)]?.toFixed(2)),
    averageMs: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2))
  };
}

const cold = await run("cold-to-warm run");
const warm = await run("warm-cache run");
const metricsResponse = await fetch(`${baseUrl}/metrics`);
const metrics = await metricsResponse.json();
const report = { generatedAt: new Date().toISOString(), requestCount, trafficPattern: prefixes, cold, warm, metrics };
console.info(JSON.stringify(report, null, 2));

const output = process.env.BENCHMARK_OUTPUT;
if (output) await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`, "utf8");
