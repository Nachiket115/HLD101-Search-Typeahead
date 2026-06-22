import { useEffect, useState } from "react";
import { fetchSuggestions } from "../api";
import type { RankingMode, Suggestion } from "../types";

interface TypeaheadState {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  cache: "hit" | "miss" | "bypass" | null;
}

const EMPTY_STATE: TypeaheadState = { suggestions: [], loading: false, error: null, cache: null };

export function useTypeahead(query: string, mode: RankingMode): TypeaheadState {
  const [state, setState] = useState<TypeaheadState>(EMPTY_STATE);

  useEffect(() => {
    if (query.trim().length === 0) {
      setState(EMPTY_STATE);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, loading: true, error: null }));
      void fetchSuggestions(query, mode, controller.signal)
        .then((response) => {
          setState({ suggestions: response.suggestions, loading: false, error: null, cache: response.cache });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setState({ suggestions: [], loading: false, error: error instanceof Error ? error.message : "Unable to load suggestions", cache: null });
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, mode]);

  return state;
}
