export const SLEEPER_API_BASE = "https://api.sleeper.app/v1";
export const SLEEPER_STATS_BASE = "https://api.sleeper.com";
export const SLEEPER_CDN = "https://sleepercdn.com";

export const NFLVERSE_BASE =
  "https://github.com/nflverse/nflverse-data/releases/download";

export const POSITION_COLORS: Record<string, string> = {
  QB: "#ff6b81",
  RB: "#7bed9f",
  WR: "#70a1ff",
  TE: "#ffa502",
  K: "#a29bfe",
  DEF: "#b8860b",
  DRAFT: "#a29bfe",
};

// Deeper, more saturated variants for chart fills (same hue families)
export const CHART_COLORS: Record<string, string> = {
  QB: "#e63950",
  RB: "#2ecc71",
  WR: "#3b82f6",
  TE: "#f59e0b",
  DRAFT: "#8b5cf6",
};

export const ROSTER_POSITIONS_ORDER = [
  "QB",
  "RB",
  "WR",
  "TE",
  "FLEX",
  "SUPER_FLEX",
  "K",
  "DEF",
  "BN",
];
