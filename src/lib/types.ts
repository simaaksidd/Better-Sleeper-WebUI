export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
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
}

export interface SleeperPlayer {
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

export interface SleeperTransaction {
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
  week: number;
}

export interface SleeperDraftPick {
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
}

export interface PlayerStat {
  player_id: string;
  season: number;
  week: number;
  opponent_team: string;
  team: string;
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

export interface RosterWithUser {
  roster_id: number;
  owner_id: string;
  display_name: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_against: number;
  players: PlayerOnRoster[];
  starters: string[];
  reserve: string[];
}

export interface PlayerOnRoster {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  injury_status: string | null;
  years_exp: number;
  age: number | null;
}

export interface ResolvedTrade {
  transaction_id: string;
  created: number;
  week: number;
  sides: TradeSide[];
}

export interface TradeSide {
  roster_id: number;
  display_name: string;
  avatar: string | null;
  players_received: PlayerOnRoster[];
  draft_picks_received: Array<{
    season: string;
    round: number;
    original_owner: string;
  }>;
}

export interface LeagueInfo {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  scoring_type: string;
}

export interface NflState {
  season: string;
  week: number;
  season_type: string;
  display_week: number;
}

// ── Power Rankings ─────────────────────────────────────────────

export interface PRPlayerEntry {
  name: string;
  value: number;
  is_starter: boolean;
  sleeper_id: string;
}

export interface PRPickEntry {
  label: string;
  value: number;
  via: string | null;
}

export interface PRPositionGroup {
  rank: number;
  value: number;
  avg_age: number;
  players: PRPlayerEntry[];
}

export interface PRDraftGroup {
  rank: number;
  value: number;
  picks: PRPickEntry[];
}

export interface PRTeam {
  roster_id: number;
  owner_name: string;
  team_name: string;
  avatar: string | null;
  contender_tier: string;
  contender_color: string;
  contender_bg_color: string;
  overall_rank: number;
  overall_value: number;
  starter_rank: number;
  starter_value: number;
  avg_age: number;
  team_needs: string[];
  positions: {
    QB: PRPositionGroup;
    RB: PRPositionGroup;
    WR: PRPositionGroup;
    TE: PRPositionGroup;
    DRAFT: PRDraftGroup;
  };
}

export interface PowerRankingsData {
  teams: PRTeam[];
}
