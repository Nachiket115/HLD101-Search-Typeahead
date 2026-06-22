import { BarChart3, Flame } from "lucide-react";
import type { RankingMode } from "../types";

interface ModeControlProps {
  mode: RankingMode;
  onChange: (mode: RankingMode) => void;
}

export function ModeControl({ mode, onChange }: ModeControlProps) {
  return (
    <div className="mode-control" role="group" aria-label="Suggestion ranking">
      <button type="button" className={mode === "enhanced" ? "active" : ""} onClick={() => onChange("enhanced")}>
        <Flame aria-hidden="true" size={15} /> Trending
      </button>
      <button type="button" className={mode === "basic" ? "active" : ""} onClick={() => onChange("basic")}>
        <BarChart3 aria-hidden="true" size={15} /> All time
      </button>
    </div>
  );
}
