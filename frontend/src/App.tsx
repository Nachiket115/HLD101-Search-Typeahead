import { Database, SearchCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchTrending, submitSearch } from "./api";
import { ModeControl } from "./components/ModeControl";
import { SearchBox } from "./components/SearchBox";
import { TrendingList } from "./components/TrendingList";
import { useTypeahead } from "./hooks/useTypeahead";
import type { RankingMode, Suggestion } from "./types";
import "./styles.css";

export function App() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<RankingMode>("enhanced");
  const [message, setMessage] = useState<string | null>(null);
  const [trending, setTrending] = useState<Suggestion[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const typeahead = useTypeahead(query, mode);

  const loadTrending = useCallback((signal?: AbortSignal) => {
    setTrendingLoading(true);
    setTrendingError(null);
    void fetchTrending(signal)
      .then((response) => setTrending(response.suggestions))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTrendingError(error instanceof Error ? error.message : "Unable to load trends");
      })
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTrending(controller.signal);
    return () => controller.abort();
  }, [loadTrending]);

  async function handleSubmit(value: string): Promise<void> {
    const submitted = value.trim();
    if (!submitted) return;
    setQuery(submitted);
    setMessage(null);
    try {
      await submitSearch(submitted);
      setMessage(`Searched for “${submitted.toLowerCase()}”`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search could not be submitted");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Signal Search home">
          <span className="brand-mark"><SearchCheck aria-hidden="true" size={19} /></span>
          <span>Signal Search</span>
        </a>
        <span className="system-status"><i /> Systems online</span>
      </header>

      <main>
        <section className="search-workspace" aria-labelledby="search-title">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow"><Database aria-hidden="true" size={15} /> Query index</span>
              <h1 id="search-title">Find what people search for</h1>
            </div>
            <ModeControl mode={mode} onChange={setMode} />
          </div>
          <SearchBox
            query={query}
            suggestions={typeahead.suggestions}
            loading={typeahead.loading}
            error={typeahead.error}
            onQueryChange={setQuery}
            onSubmit={(value) => void handleSubmit(value)}
          />
          <div className="workspace-meta" aria-live="polite">
            <span>{mode === "enhanced" ? "Recency-aware ranking" : "All-time count ranking"}</span>
            {typeahead.cache ? <span>Cache {typeahead.cache}</span> : null}
            {message ? <strong>{message}</strong> : null}
          </div>
        </section>

        <TrendingList
          suggestions={trending}
          loading={trendingLoading}
          error={trendingError}
          onSelect={(value) => {
            setQuery(value);
            void handleSubmit(value);
          }}
          onRefresh={() => loadTrending()}
        />
      </main>
    </div>
  );
}
