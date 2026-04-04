import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM league LIMIT 1")
    .get() as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json(
      { error: "No league data. Run sync first." },
      { status: 404 }
    );
  }

  const nflState = db
    .prepare("SELECT * FROM nfl_state WHERE key = 'current'")
    .get() as Record<string, unknown> | undefined;

  return NextResponse.json({
    league_id: row.league_id,
    name: row.name,
    season: row.season,
    total_rosters: row.total_rosters,
    roster_positions: JSON.parse(row.roster_positions as string),
    scoring_settings: JSON.parse(row.scoring_settings as string),
    nfl_state: nflState
      ? {
          season: nflState.season,
          week: nflState.week,
          season_type: nflState.season_type,
          display_week: nflState.display_week,
        }
      : null,
  });
}
