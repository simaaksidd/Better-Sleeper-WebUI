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
}
