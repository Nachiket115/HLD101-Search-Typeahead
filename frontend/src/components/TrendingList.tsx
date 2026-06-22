import { ArrowUpRight, Flame, LoaderCircle, RefreshCw } from "lucide-react";
import type { Suggestion } from "../types";

interface TrendingListProps {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  onSelect: (query: string) => void;
  onRefresh: () => void;
}

export function TrendingList({ suggestions, loading, error, onSelect, onRefresh }: TrendingListProps) {
  return (
    <section className="trending-section" aria-labelledby="trending-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Flame aria-hidden="true" size={15} /> Live signals</span>
          <h2 id="trending-title">Trending searches</h2>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh trending searches" title="Refresh">
          <RefreshCw aria-hidden="true" size={17} />
        </button>
      </div>

      {loading ? <div className="section-state"><LoaderCircle className="spin" aria-hidden="true" /> Loading trends</div> : null}
      {error ? <div className="section-state error-state">{error}</div> : null}
      {!loading && !error ? (
        <ol className="trending-list">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.query}>
              <button type="button" onClick={() => onSelect(suggestion.query)}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <span className="trend-query">{suggestion.query}</span>
                <span className="trend-count">{suggestion.count.toLocaleString()} searches</span>
                <ArrowUpRight aria-hidden="true" size={17} />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
