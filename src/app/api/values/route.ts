import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLeagueValueConfig, tepLabel } from "@/lib/league-values";

export async function GET() {
  const db = getDb();
  const { valueColumn, isSuperFlex, tepLevel } = getLeagueValueConfig(db);

  const rows = db
    .prepare(
      `SELECT player, pos, team, ${valueColumn} as value, sleeper_id, is_pick, scrape_date
       FROM dynasty_values`
    )
    .all() as Array<{
    player: string;
    pos: string | null;
    team: string | null;
    value: number;
    sleeper_id: string | null;
    is_pick: number;
    scrape_date: string | null;
  }>;

  const players: Record<string, { value: number; ecr: number | null; ecr_pos: string | null }> = {};
  const picks: Array<{ name: string; value: number }> = [];
  let scrapeDate: string | null = null;

  for (const row of rows) {
    if (!scrapeDate && row.scrape_date) scrapeDate = row.scrape_date;

    if (row.is_pick) {
      picks.push({ name: row.player, value: row.value ?? 0 });
    } else if (row.sleeper_id) {
      players[row.sleeper_id] = {
        value: row.value ?? 0,
        ecr: null,
        ecr_pos: null,
      };
    }
  }

  return NextResponse.json({
    players,
    picks,
    scrape_date: scrapeDate,
    is_superflex: isSuperFlex,
    tep_level: tepLabel(tepLevel),
  });
}
