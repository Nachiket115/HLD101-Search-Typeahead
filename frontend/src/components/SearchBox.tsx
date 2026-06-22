import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { Suggestion } from "../types";

interface SearchBoxProps {
  query: string;
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
}

export function SearchBox({ query, suggestions, loading, error, onQueryChange, onSubmit }: SearchBoxProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const open = query.trim().length > 0;

  useEffect(() => setActiveIndex(-1), [query, suggestions]);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onQueryChange(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = activeIndex >= 0 ? suggestions[activeIndex]?.query : query;
      if (selected) onSubmit(selected);
    } else if (event.key === "Escape") {
      setActiveIndex(-1);
    }
  }

  return (
    <div className="search-combobox">
      <div className="search-field">
        <Search aria-hidden="true" size={21} />
        <input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search queries"
          aria-label="Search queries"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          maxLength={200}
        />
        {loading ? <LoaderCircle className="spin" aria-label="Loading suggestions" size={19} /> : null}
        {query ? (
          <button className="clear-button" type="button" onClick={() => onQueryChange("")} aria-label="Clear search">
            <X aria-hidden="true" size={17} />
          </button>
        ) : null}
        <button className="search-button" type="button" onClick={() => onSubmit(query)} disabled={!query.trim()}>
          Search
        </button>
      </div>

      {open ? (
        <div className="suggestion-popover">
          {error ? <p className="state-message error-state">{error}</p> : null}
          {!error && !loading && suggestions.length === 0 ? <p className="state-message">No matching searches</p> : null}
          {suggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" aria-label="Search suggestions">
              {suggestions.map((suggestion, index) => (
                <li
                  id={`${listboxId}-${index}`}
                  key={suggestion.query}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "active" : ""}
                >
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSubmit(suggestion.query)}>
                    <Search aria-hidden="true" size={16} />
                    <span>{suggestion.query}</span>
                    <strong>{suggestion.count.toLocaleString()}</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
