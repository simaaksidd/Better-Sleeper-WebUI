import { SLEEPER_API_BASE, SLEEPER_STATS_BASE } from "./constants";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchNflState() {
  return fetchJson<{
    season: string;
    week: number;
    season_type: string;
    display_week: number;
  }>(`${SLEEPER_API_BASE}/state/nfl`);
}

export async function fetchLeague(leagueId: string) {
  return fetchJson<{
    league_id: string;
    name: string;
    season: string;
    total_rosters: number;
    roster_positions: string[];
    scoring_settings: Record<string, number>;
  }>(`${SLEEPER_API_BASE}/league/${leagueId}`);
}

export async function fetchUsers(leagueId: string) {
  return fetchJson<
    Array<{
      user_id: string;
      display_name: string;
      avatar: string | null;
    }>
  >(`${SLEEPER_API_BASE}/league/${leagueId}/users`);
}

export async function fetchRosters(leagueId: string) {
  return fetchJson<
    Array<{
      roster_id: number;
      owner_id: string;
      players: string[] | null;
      starters: string[] | null;
      reserve: string[] | null;
      settings: {
        wins: number;
        losses: number;
        ties: number;
        fpts: number;
        fpts_decimal: number;
        fpts_against: number;
        fpts_against_decimal: number;
      };
    }>
  >(`${SLEEPER_API_BASE}/league/${leagueId}/rosters`);
}

export async function fetchAllPlayers() {
  return fetchJson<
    Record<
      string,
      {
        player_id: string;
        first_name: string;
        last_name: string;
        full_name: string;
        position: string;
        team: string | null;
        age: number | null;
        height: string | null;
        weight: string | null;
        college: string | null;
        years_exp: number;
        injury_status: string | null;
        status: string;
      }
    >
  >(`${SLEEPER_API_BASE}/players/nfl`);
}

export async function fetchTransactions(leagueId: string, week: number) {
  return fetchJson<
    Array<{
      transaction_id: string;
      type: string;
      status: string;
      roster_ids: number[];
      adds: Record<string, number> | null;
      drops: Record<string, number> | null;
      draft_picks: Array<{
        season: string;
        round: number;
        roster_id: number;
        previous_owner_id: number;
        owner_id: number;
      }>;
      settings: Record<string, number> | null;
      created: number;
    }>
  >(`${SLEEPER_API_BASE}/league/${leagueId}/transactions/${week}`);
}

export interface SleeperDraft {
  draft_id: string;
  season: string;
  status: string;
  draft_order: Record<string, number> | null;
  settings: {
    rounds: number;
    player_type: number;
    [key: string]: unknown;
  };
}

export async function fetchDrafts(leagueId: string) {
  return fetchJson<SleeperDraft[]>(
    `${SLEEPER_API_BASE}/league/${leagueId}/drafts`
  );
}

export async function fetchDraftPicks(draftId: string) {
  return fetchJson<
    Array<{
      round: number;
      pick_no: number;
      roster_id: number;
      player_id: string;
      picked_by: string;
      metadata: {
        first_name: string;
        last_name: string;
        position: string;
        team: string;
      };
    }>
  >(`${SLEEPER_API_BASE}/draft/${draftId}/picks`);
}

export async function fetchTradedPicks(leagueId: string) {
  return fetchJson<
    Array<{
      season: string;
      round: number;
      roster_id: number;
      previous_owner_id: number;
      owner_id: number;
    }>
  >(`${SLEEPER_API_BASE}/league/${leagueId}/traded_picks`);
}

export interface SleeperBulkStatEntry {
  player_id: string;
  team: string | null;
  opponent: string | null;
  season: number;
  week: number;
  stats: Record<string, number>;
}

export async function fetchSleeperBulkWeekStats(
  season: number,
  week: number,
  seasonType: "regular" | "post" = "regular"
): Promise<SleeperBulkStatEntry[] | null> {
  try {
    const res = await fetch(
      `${SLEEPER_STATS_BASE}/stats/nfl/${season}/${week}?season_type=${seasonType}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((entry: Record<string, unknown>) => ({
      player_id: String(entry.player_id),
      team: (entry.team as string) || null,
      opponent: (entry.opponent as string) || null,
      season,
      week,
      stats: (entry.stats as Record<string, number>) || {},
    }));
  } catch {
    return null;
  }
}

export async function fetchSleeperPlayerStats(
  sleeperId: string,
  season: number,
  week: number
) {
  try {
    const res = await fetch(
      `${SLEEPER_STATS_BASE}/stats/nfl/player/${sleeperId}?season_type=regular&season=${season}&grouping=week&week=${week}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
