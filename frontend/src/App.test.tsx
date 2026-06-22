import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { vi, describe, expect, it } from "vitest";
import { App } from "./App";

vi.mock("./api", () => ({
  fetchTrending: vi.fn().mockResolvedValue({ suggestions: [], cache: "miss" }),
  fetchSuggestions: vi.fn().mockResolvedValue({ suggestions: [], cache: "miss", mode: "enhanced", query: "" }),
  submitSearch: vi.fn().mockResolvedValue(undefined)
}));

describe("App", () => {
  it("renders the search workflow and ranking controls", async () => {
    render(<App />);
    expect(screen.getByRole("combobox", { name: "Search queries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trending/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trending searches" })).toBeInTheDocument();
  });
});
