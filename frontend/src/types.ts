export type RankingMode = "basic" | "enhanced";

export interface Suggestion {
  query: string;
  count: number;
  score: number;
}

export interface SuggestResponse {
  query: string;
  mode: RankingMode;
  suggestions: Suggestion[];
  cache: "hit" | "miss" | "bypass";
}

export interface TrendingResponse {
  suggestions: Suggestion[];
  cache: "hit" | "miss" | "bypass";
}
