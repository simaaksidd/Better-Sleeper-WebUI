import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchSleeperPlayerStats } from "@/lib/sleeper-api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sleeperId } = await params;
  const { searchParams } = new URL(req.url);

  const db = getDb();

  // Default season from league table, not hardcoded
  const leagueRow = db
    .prepare("SELECT season FROM league LIMIT 1")
    .get() as { season: string } | undefined;
  const defaultSeason = leagueRow ? parseInt(leagueRow.season) : new Date().getFullYear() - 1;
  const season = parseInt(searchParams.get("season") || String(defaultSeason));

  // Map sleeper_id → gsis_id
  const mapping = db
    .prepare("SELECT gsis_id FROM player_id_map WHERE sleeper_id = ?")
    .get(sleeperId) as { gsis_id: string } | undefined;

  if (mapping) {
    const stats = db
      .prepare(
        `SELECT * FROM player_stats
         WHERE player_id = ? AND season = ? AND season_type IN ('REG', 'POST')
         ORDER BY week ASC`
      )
      .all(mapping.gsis_id, season) as Array<Record<string, unknown>>;

    if (stats.length > 0) {
      attachRanks(db, stats, mapping.gsis_id, sleeperId, season);
      return NextResponse.json({ source: "nflverse", stats });
    }
  }

  // Check by sleeper_id directly (for Sleeper bulk-synced stats)
  const directStats = db
    .prepare(
      `SELECT * FROM player_stats
       WHERE player_id = ? AND season = ? AND season_type IN ('REG', 'POST')
       ORDER BY week ASC`
    )
    .all(sleeperId, season) as Array<Record<string, unknown>>;

  if (directStats.length > 0) {
    attachRanks(db, directStats, sleeperId, sleeperId, season);
    return NextResponse.json({ source: "sleeper", stats: directStats });
  }

  // Fallback: Sleeper undocumented stats (per-player, on-demand)
  const nflState = db
    .prepare("SELECT * FROM nfl_state WHERE key = 'current'")
    .get() as Record<string, unknown> | undefined;
  const maxWeek = nflState ? (nflState.week as number) : 18;

  const sleeperStats: Array<Record<string, unknown>> = [];
  for (let week = 1; week <= maxWeek; week++) {
    const data = await fetchSleeperPlayerStats(sleeperId, season, week);
    if (data && typeof data === "object") {
      // Normalize Sleeper keys → nflverse shape
      sleeperStats.push({
        player_id: sleeperId,
        season,
        week,
        season_type: "REG",
        team: null,
        opponent_team: null,
        completions: data.pass_cmp || 0,
        attempts: data.pass_att || 0,
        passing_yards: data.pass_yd || 0,
        passing_tds: data.pass_td || 0,
        passing_interceptions: data.pass_int || 0,
        sacks_suffered: data.pass_sack || 0,
        sack_yards_lost: 0,
        carries: data.rush_att || 0,
        rushing_yards: data.rush_yd || 0,
        rushing_tds: data.rush_td || 0,
        targets: data.rec_tgt || 0,
        receptions: data.rec || 0,
        receiving_yards: data.rec_yd || 0,
        receiving_tds: data.rec_td || 0,
        rushing_fumbles: data.fum || 0,
        rushing_fumbles_lost: data.fum_lost || 0,
        receiving_fumbles: 0,
        receiving_fumbles_lost: 0,
        sack_fumbles: 0,
        sack_fumbles_lost: 0,
        fantasy_points: data.pts_std || 0,
        fantasy_points_ppr: data.pts_ppr || 0,
        fg_made: data.fgm || 0,
        fg_att: data.fga || 0,
        pat_made: data.xpm || 0,
        pat_att: data.xpa || 0,
        source: "sleeper_fallback",
      });
    }
  }

  if (sleeperStats.length > 0) {
    // Cache to DB
    const upsert = db.prepare(
      `INSERT OR REPLACE INTO player_stats (
        player_id, season, week, season_type, team, opponent_team,
        completions, attempts, passing_yards, passing_tds, passing_interceptions,
        sacks_suffered, sack_yards_lost, carries, rushing_yards, rushing_tds,
        targets, receptions, receiving_yards, receiving_tds,
        rushing_fumbles, rushing_fumbles_lost, receiving_fumbles, receiving_fumbles_lost,
        sack_fumbles, sack_fumbles_lost,
        fantasy_points, fantasy_points_ppr,
        fg_made, fg_att, pat_made, pat_att,
        source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
    );

    const cacheBatch = db.transaction(() => {
      for (const s of sleeperStats) {
        upsert.run(
          s.player_id, s.season, s.week, s.season_type, s.team, s.opponent_team,
          s.completions, s.attempts, s.passing_yards, s.passing_tds, s.passing_interceptions,
          s.sacks_suffered, s.sack_yards_lost, s.carries, s.rushing_yards, s.rushing_tds,
          s.targets, s.receptions, s.receiving_yards, s.receiving_tds,
          s.rushing_fumbles, s.rushing_fumbles_lost, s.receiving_fumbles, s.receiving_fumbles_lost,
          s.sack_fumbles, s.sack_fumbles_lost,
          s.fantasy_points, s.fantasy_points_ppr,
          s.fg_made, s.fg_att, s.pat_made, s.pat_att,
          s.source
        );
      }
    });
    cacheBatch();

    const filtered = sleeperStats.filter(
      (s) => (s.fantasy_points as number) > 0 || (s.fantasy_points_ppr as number) > 0
    );
    attachRanks(db, filtered, sleeperId, sleeperId, season);
    return NextResponse.json({ source: "sleeper_fallback", stats: filtered });
  }

  return NextResponse.json({ source: "empty", stats: [] });
}

/**
 * Compute weekly overall rank and position rank, then attach to each stat row.
 * Uses SQL window functions over all player_stats for the season.
 */
function attachRanks(
  db: ReturnType<typeof getDb>,
  stats: Array<Record<string, unknown>>,
  statsPlayerId: string,
  sleeperId: string,
  season: number
) {
  // Look up position
  const playerRow = db
    .prepare("SELECT position FROM players WHERE player_id = ?")
    .get(sleeperId) as { position: string } | undefined;
  const position = playerRow?.position;

  // Overall rank per week
  const ovrRows = db
    .prepare(
      `WITH ranked AS (
        SELECT player_id, week, season_type,
          RANK() OVER (PARTITION BY week, season_type ORDER BY fantasy_points_ppr DESC) as ovr_rank
        FROM player_stats
        WHERE season = ? AND fantasy_points_ppr > 0 AND season_type IN ('REG', 'POST')
      )
      SELECT week, season_type, ovr_rank FROM ranked WHERE player_id = ?`
    )
    .all(season, statsPlayerId) as Array<{ week: number; season_type: string; ovr_rank: number }>;

  const ovrMap = new Map<string, number>();
  for (const r of ovrRows) {
    ovrMap.set(`${r.week}-${r.season_type}`, r.ovr_rank);
  }

  // Position rank per week
  const posMap = new Map<string, number>();
  if (position) {
    const posRows = db
      .prepare(
        `WITH pos_ids AS (
          SELECT gsis_id AS pid FROM player_id_map WHERE position = ?
          UNION
          SELECT sleeper_id AS pid FROM player_id_map WHERE position = ? AND sleeper_id IS NOT NULL
        ),
        ranked AS (
          SELECT ps.player_id, ps.week, ps.season_type,
            RANK() OVER (PARTITION BY ps.week, ps.season_type ORDER BY ps.fantasy_points_ppr DESC) as pos_rank
          FROM player_stats ps
          WHERE ps.season = ? AND ps.fantasy_points_ppr > 0 AND ps.season_type IN ('REG', 'POST')
            AND ps.player_id IN (SELECT pid FROM pos_ids)
        )
        SELECT week, season_type, pos_rank FROM ranked WHERE player_id = ?`
      )
      .all(position, position, season, statsPlayerId) as Array<{
        week: number;
        season_type: string;
        pos_rank: number;
      }>;

    for (const r of posRows) {
      posMap.set(`${r.week}-${r.season_type}`, r.pos_rank);
    }
  }

  // Merge into stat rows
  for (const s of stats) {
    const key = `${s.week}-${s.season_type}`;
    s.pos_rank = posMap.get(key) ?? null;
    s.ovr_rank = ovrMap.get(key) ?? null;
  }
}
