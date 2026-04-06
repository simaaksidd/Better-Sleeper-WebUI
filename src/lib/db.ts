import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "sleeper.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nfl_state (
      key TEXT PRIMARY KEY DEFAULT 'current',
      season TEXT NOT NULL,
      week INTEGER NOT NULL,
      season_type TEXT NOT NULL,
      display_week INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS league (
      league_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      season TEXT NOT NULL,
      total_rosters INTEGER NOT NULL,
      roster_positions TEXT NOT NULL,
      scoring_settings TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      position TEXT,
      team TEXT,
      age INTEGER,
      height TEXT,
      weight TEXT,
      college TEXT,
      years_exp INTEGER DEFAULT 0,
      injury_status TEXT,
      status TEXT,
      espn_id INTEGER,
      number INTEGER,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS rosters (
      roster_id INTEGER PRIMARY KEY,
      owner_id TEXT,
      players TEXT NOT NULL,
      starters TEXT NOT NULL,
      reserve TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      fpts INTEGER DEFAULT 0,
      fpts_decimal INTEGER DEFAULT 0,
      fpts_against INTEGER DEFAULT 0,
      fpts_against_decimal INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (owner_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      roster_ids TEXT NOT NULL,
      adds TEXT,
      drops TEXT,
      draft_picks TEXT,
      settings TEXT,
      created INTEGER NOT NULL,
      week INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS drafts (
      draft_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      pick_no INTEGER NOT NULL,
      roster_id INTEGER,
      player_id TEXT,
      picked_by TEXT,
      metadata TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (draft_id, pick_no)
    );

    CREATE TABLE IF NOT EXISTS player_id_map (
      gsis_id TEXT PRIMARY KEY,
      sleeper_id TEXT,
      name TEXT,
      position TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_player_id_map_sleeper ON player_id_map(sleeper_id);

    CREATE TABLE IF NOT EXISTS player_stats (
      player_id TEXT NOT NULL,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      season_type TEXT DEFAULT 'REG',
      team TEXT,
      opponent_team TEXT,
      completions REAL DEFAULT 0,
      attempts REAL DEFAULT 0,
      passing_yards REAL DEFAULT 0,
      passing_tds REAL DEFAULT 0,
      passing_interceptions REAL DEFAULT 0,
      sacks_suffered REAL DEFAULT 0,
      sack_yards_lost REAL DEFAULT 0,
      carries REAL DEFAULT 0,
      rushing_yards REAL DEFAULT 0,
      rushing_tds REAL DEFAULT 0,
      targets REAL DEFAULT 0,
      receptions REAL DEFAULT 0,
      receiving_yards REAL DEFAULT 0,
      receiving_tds REAL DEFAULT 0,
      rushing_fumbles REAL DEFAULT 0,
      rushing_fumbles_lost REAL DEFAULT 0,
      receiving_fumbles REAL DEFAULT 0,
      receiving_fumbles_lost REAL DEFAULT 0,
      sack_fumbles REAL DEFAULT 0,
      sack_fumbles_lost REAL DEFAULT 0,
      fantasy_points REAL DEFAULT 0,
      fantasy_points_ppr REAL DEFAULT 0,
      fg_made REAL DEFAULT 0,
      fg_att REAL DEFAULT 0,
      pat_made REAL DEFAULT 0,
      pat_att REAL DEFAULT 0,
      source TEXT DEFAULT 'nflverse',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (player_id, season, week)
    );

    CREATE INDEX IF NOT EXISTS idx_player_stats_season ON player_stats(season, week);

    CREATE TABLE IF NOT EXISTS combine_results (
      player_name TEXT NOT NULL,
      pos TEXT,
      school TEXT,
      ht TEXT,
      wt TEXT,
      forty REAL,
      vertical REAL,
      bench INTEGER,
      broad_jump INTEGER,
      cone REAL,
      shuttle REAL,
      draft_year INTEGER,
      draft_team TEXT,
      draft_round INTEGER,
      draft_ovr INTEGER,
      pfr_id TEXT,
      cfb_id TEXT,
      sleeper_id TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (player_name, school, draft_year)
    );

    CREATE TABLE IF NOT EXISTS college_stats_season (
      espn_college_id TEXT NOT NULL,
      season INTEGER NOT NULL,
      stat_type TEXT NOT NULL DEFAULT 'general',
      games_played INTEGER DEFAULT 0,
      completions INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      passing_yards INTEGER DEFAULT 0,
      passing_tds INTEGER DEFAULT 0,
      interceptions INTEGER DEFAULT 0,
      carries INTEGER DEFAULT 0,
      rushing_yards INTEGER DEFAULT 0,
      rushing_tds INTEGER DEFAULT 0,
      receptions INTEGER DEFAULT 0,
      receiving_yards INTEGER DEFAULT 0,
      receiving_tds INTEGER DEFAULT 0,
      fumbles_lost INTEGER DEFAULT 0,
      sacks REAL DEFAULT 0,
      tackles_total REAL DEFAULT 0,
      tackles_for_loss REAL DEFAULT 0,
      pass_defended INTEGER DEFAULT 0,
      def_interceptions INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (espn_college_id, season)
    );

    CREATE TABLE IF NOT EXISTS college_stats_games (
      espn_college_id TEXT NOT NULL,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      game_date TEXT,
      opponent TEXT,
      result TEXT,
      completions INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      passing_yards INTEGER DEFAULT 0,
      passing_tds INTEGER DEFAULT 0,
      interceptions INTEGER DEFAULT 0,
      carries INTEGER DEFAULT 0,
      rushing_yards INTEGER DEFAULT 0,
      rushing_tds INTEGER DEFAULT 0,
      receptions INTEGER DEFAULT 0,
      receiving_yards INTEGER DEFAULT 0,
      receiving_tds INTEGER DEFAULT 0,
      fumbles_lost INTEGER DEFAULT 0,
      sacks REAL DEFAULT 0,
      tackles_total REAL DEFAULT 0,
      tackles_for_loss REAL DEFAULT 0,
      pass_defended INTEGER DEFAULT 0,
      def_interceptions INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (espn_college_id, season, week)
    );
  `);

  // Migrations for existing databases
  const cols = db
    .prepare("PRAGMA table_info(players)")
    .all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("espn_id")) {
    db.exec("ALTER TABLE players ADD COLUMN espn_id INTEGER");
  }
  if (!colNames.has("number")) {
    db.exec("ALTER TABLE players ADD COLUMN number INTEGER");
  }

  // Migration: add espn_college_id to player_id_map
  const idMapCols = db
    .prepare("PRAGMA table_info(player_id_map)")
    .all() as Array<{ name: string }>;
  const idMapColNames = new Set(idMapCols.map((c) => c.name));
  if (!idMapColNames.has("espn_college_id")) {
    db.exec("ALTER TABLE player_id_map ADD COLUMN espn_college_id TEXT");
  }
}
