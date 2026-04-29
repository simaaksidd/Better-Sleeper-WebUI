// Single source of truth for selecting the dynasty_values column to read,
// based on the league's roster_positions (Superflex vs 1QB) and scoring
// settings (TEP off / TE+ / TE++). Used by /api/values and /api/power-rankings
// to guarantee both pipelines surface the same number for the same player.

import type { Database } from "better-sqlite3";

export type TepLevel = "off" | "tep" | "tepp";

export type ValueColumn =
  | "value_1qb"
  | "value_1qb_tep"
  | "value_1qb_tepp"
  | "value_sf"
  | "value_sf_tep"
  | "value_sf_tepp";

export interface LeagueValueConfig {
  valueColumn: ValueColumn;
  isSuperFlex: boolean;
  tepLevel: TepLevel;
}

function tepLevelFromBonus(bonus: number): TepLevel {
  if (bonus >= 0.75) return "tepp";
  if (bonus >= 0.25) return "tep";
  return "off";
}

function pickColumn(isSuperFlex: boolean, tepLevel: TepLevel): ValueColumn {
  if (isSuperFlex) {
    if (tepLevel === "tepp") return "value_sf_tepp";
    if (tepLevel === "tep") return "value_sf_tep";
    return "value_sf";
  }
  if (tepLevel === "tepp") return "value_1qb_tepp";
  if (tepLevel === "tep") return "value_1qb_tep";
  return "value_1qb";
}

export function getLeagueValueConfig(db: Database): LeagueValueConfig {
  const row = db
    .prepare("SELECT roster_positions, scoring_settings FROM league LIMIT 1")
    .get() as { roster_positions: string; scoring_settings: string } | undefined;

  if (!row) {
    return { valueColumn: "value_1qb", isSuperFlex: false, tepLevel: "off" };
  }

  let isSuperFlex = false;
  try {
    const positions: string[] = JSON.parse(row.roster_positions);
    isSuperFlex =
      positions.includes("SUPER_FLEX") ||
      positions.filter((p) => p === "QB").length >= 2;
  } catch {
    // leave isSuperFlex = false
  }

  let tepLevel: TepLevel = "off";
  try {
    const scoring = JSON.parse(row.scoring_settings) as Record<string, number>;
    tepLevel = tepLevelFromBonus(Number(scoring.bonus_rec_te ?? 0));
  } catch {
    // leave tepLevel = "off"
  }

  return {
    valueColumn: pickColumn(isSuperFlex, tepLevel),
    isSuperFlex,
    tepLevel,
  };
}

export function tepLabel(level: TepLevel): "TE+" | "TE++" | null {
  if (level === "tep") return "TE+";
  if (level === "tepp") return "TE++";
  return null;
}
