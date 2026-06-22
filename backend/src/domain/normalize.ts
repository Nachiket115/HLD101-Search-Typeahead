export const MAX_QUERY_LENGTH = 200;

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateNormalizedQuery(value: string): "empty" | "too_long" | null {
  if (value.length === 0) return "empty";
  if ([...value].length > MAX_QUERY_LENGTH) return "too_long";
  return null;
}
