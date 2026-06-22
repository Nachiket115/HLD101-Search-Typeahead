import type { RankingMode, SuggestResponse, TrendingResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchSuggestions(query: string, mode: RankingMode, signal: AbortSignal): Promise<SuggestResponse> {
  const parameters = new URLSearchParams({ q: query, mode });
  return json<SuggestResponse>(await fetch(`${API_URL}/suggest?${parameters}`, { signal }));
}

export async function fetchTrending(signal?: AbortSignal): Promise<TrendingResponse> {
  return json<TrendingResponse>(await fetch(`${API_URL}/trending`, { signal }));
}

export async function submitSearch(query: string): Promise<void> {
  await json<{ message: string }>(
    await fetch(`${API_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    })
  );
}
