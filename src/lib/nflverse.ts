import Papa from "papaparse";
import { NFLVERSE_BASE } from "./constants";

async function fetchCsv<T>(url: string): Promise<T[] | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`nflverse fetch error: ${res.status} ${url}`);
  const text = await res.text();
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return result.data;
}

export interface NflversePlayer {
  gsis_id: string | null;
  espn_id: number | null;
  display_name: string | null;
  position: string | null;
}

export async function fetchNflversePlayers(): Promise<NflversePlayer[]> {
  const rows = await fetchCsv<NflversePlayer>(
    `${NFLVERSE_BASE}/players/players.csv`
  );
  return (rows || []).filter((r) => r.gsis_id);
}

export interface NflverseStatRow {
  player_id: string;
  player_display_name: string;
  position: string;
  season: number;
  week: number;
  season_type: string;
  team: string;
  opponent_team: string;
  completions: number;
  attempts: number;
  passing_yards: number;
  passing_tds: number;
  passing_interceptions: number;
  sacks_suffered: number;
  sack_yards_lost: number;
  carries: number;
  rushing_yards: number;
  rushing_tds: number;
  targets: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  rushing_fumbles: number;
  rushing_fumbles_lost: number;
  receiving_fumbles: number;
  receiving_fumbles_lost: number;
  sack_fumbles: number;
  sack_fumbles_lost: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fg_made: number;
  fg_att: number;
  pat_made: number;
  pat_att: number;
}

export async function fetchPlayerStats(
  season: number
): Promise<NflverseStatRow[] | null> {
  return fetchCsv<NflverseStatRow>(
    `${NFLVERSE_BASE}/player_stats/player_stats_${season}.csv`
  );
}

// ── Combine data ──

export interface NflverseCombineRow {
  player_name: string;
  pos: string | null;
  school: string | null;
  ht: string | null;
  wt: string | null;
  forty: number | null;
  vertical: number | null;
  bench: number | null;
  broad_jump: number | null;
  cone: number | null;
  shuttle: number | null;
  draft_year: number | null;
  draft_team: string | null;
  draft_round: number | null;
  draft_ovr: number | null;
  pfr_id: string | null;
  cfb_id: string | null;
}

export async function fetchCombineData(): Promise<NflverseCombineRow[] | null> {
  return fetchCsv<NflverseCombineRow>(
    `${NFLVERSE_BASE}/combine/combine.csv`
  );
}
