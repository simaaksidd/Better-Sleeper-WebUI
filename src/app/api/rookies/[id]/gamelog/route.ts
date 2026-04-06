import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchCollegeGameLog } from "@/lib/espn-college";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const season = parseInt(searchParams.get("season") || "0");

  if (!season) {
    return NextResponse.json({ error: "season param required" }, { status: 400 });
  }

  const db = getDb();

  // Get ESPN college ID — fall back to player's espn_id from Sleeper data
  const idMap = db
    .prepare("SELECT espn_college_id FROM player_id_map WHERE sleeper_id = ?")
    .get(id) as { espn_college_id: string | null } | undefined;

  let espnCollegeId = idMap?.espn_college_id || null;
  if (!espnCollegeId) {
    const player = db
      .prepare("SELECT espn_id FROM players WHERE player_id = ?")
      .get(id) as { espn_id: number | null } | undefined;
    if (player?.espn_id) {
      espnCollegeId = String(player.espn_id);
    }
  }

  if (!espnCollegeId) {
    return NextResponse.json({ games: [], source: "no_espn_id" });
  }

  // Check cache first
  const cached = db
    .prepare(
      "SELECT * FROM college_stats_games WHERE espn_college_id = ? AND season = ? ORDER BY week ASC"
    )
    .all(espnCollegeId, season) as Array<Record<string, unknown>>;

  if (cached.length > 0) {
    return NextResponse.json({
      games: cached.map(formatGame),
      source: "cached",
    });
  }

  // Lazy fetch from ESPN
  try {
    const games = await fetchCollegeGameLog(espnCollegeId, season);

    if (games.length > 0) {
      const upsert = db.prepare(
        `INSERT OR REPLACE INTO college_stats_games
         (espn_college_id, season, week, game_date, opponent, result,
          completions, attempts, passing_yards, passing_tds, interceptions,
          carries, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds,
          fumbles_lost, sacks, tackles_total, tackles_for_loss, pass_defended, def_interceptions,
          updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
      );

      const insertBatch = db.transaction(() => {
        for (const g of games) {
          upsert.run(
            espnCollegeId,
            season,
            g.week,
            g.gameDate,
            g.opponent,
            g.result,
            g.completions,
            g.attempts,
            g.passingYards,
            g.passingTds,
            g.interceptions,
            g.carries,
            g.rushingYards,
            g.rushingTds,
            g.receptions,
            g.receivingYards,
            g.receivingTds,
            g.fumblesLost,
            g.sacks,
            g.tacklesTotal,
            g.tacklesForLoss,
            g.passDefended,
            g.defInterceptions
          );
        }
      });
      insertBatch();
    }

    return NextResponse.json({
      games: games.map((g) => ({
        week: g.week,
        game_date: g.gameDate,
        opponent: g.opponent,
        result: g.result,
        completions: g.completions,
        attempts: g.attempts,
        passing_yards: g.passingYards,
        passing_tds: g.passingTds,
        interceptions: g.interceptions,
        carries: g.carries,
        rushing_yards: g.rushingYards,
        rushing_tds: g.rushingTds,
        receptions: g.receptions,
        receiving_yards: g.receivingYards,
        receiving_tds: g.receivingTds,
        fumbles_lost: g.fumblesLost,
        sacks: g.sacks,
        tackles_total: g.tacklesTotal,
        tackles_for_loss: g.tacklesForLoss,
        pass_defended: g.passDefended,
        def_interceptions: g.defInterceptions,
      })),
      source: "espn",
    });
  } catch {
    return NextResponse.json({ games: [], source: "error" });
  }
}

function formatGame(row: Record<string, unknown>) {
  return {
    week: row.week,
    game_date: row.game_date,
    opponent: row.opponent,
    result: row.result,
    completions: row.completions,
    attempts: row.attempts,
    passing_yards: row.passing_yards,
    passing_tds: row.passing_tds,
    interceptions: row.interceptions,
    carries: row.carries,
    rushing_yards: row.rushing_yards,
    rushing_tds: row.rushing_tds,
    receptions: row.receptions,
    receiving_yards: row.receiving_yards,
    receiving_tds: row.receiving_tds,
    fumbles_lost: row.fumbles_lost,
    sacks: row.sacks,
    tackles_total: row.tackles_total,
    tackles_for_loss: row.tackles_for_loss,
    pass_defended: row.pass_defended,
    def_interceptions: row.def_interceptions,
  };
}
