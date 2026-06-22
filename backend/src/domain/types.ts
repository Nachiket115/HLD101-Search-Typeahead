export type RankingMode = "basic" | "enhanced";

export interface QueryRecord {
  query: string;
  count: number;
  recencyEma: number;
  currentHourCount: number;
  currentHourStartedAt: Date;
}

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
