import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  // Determine 1QB vs Superflex from league roster_positions
  const league = db
    .prepare("SELECT roster_positions FROM league LIMIT 1")
    .get() as { roster_positions: string } | undefined;

  let isSuperFlex = false;
  if (league) {
    const positions: string[] = JSON.parse(league.roster_positions);
    const hasSF = positions.includes("SUPER_FLEX");
    const qbCount = positions.filter((p) => p === "QB").length;
    isSuperFlex = hasSF || qbCount >= 2;
  }

  const valueCol = isSuperFlex ? "value_2qb" : "value_1qb";
  const ecrCol = isSuperFlex ? "ecr_2qb" : "ecr_1qb";

  // Fetch all rows
  const rows = db
    .prepare(
      `SELECT player, pos, team, ${valueCol} as value, ${ecrCol} as ecr, ecr_pos, sleeper_id, scrape_date
       FROM dynasty_values`
    )
    .all() as Array<{
    player: string;
    pos: string | null;
    team: string | null;
    value: number;
    ecr: number | null;
    ecr_pos: string | null;
    sleeper_id: string | null;
    scrape_date: string | null;
  }>;

  // Split into players (have sleeper_id) and picks (no team, no sleeper_id)
  const players: Record<string, { value: number; ecr: number | null; ecr_pos: string | null }> = {};
  const picks: Array<{ name: string; value: number }> = [];
  let scrapeDate: string | null = null;

  for (const row of rows) {
    if (!scrapeDate && row.scrape_date) {
      scrapeDate = row.scrape_date;
    }

    if (row.sleeper_id) {
      players[row.sleeper_id] = {
        value: row.value ?? 0,
        ecr: row.ecr ?? null,
        ecr_pos: row.ecr_pos ?? null,
      };
    } else if (!row.team) {
      // Pick rows have no team
      picks.push({ name: row.player, value: row.value ?? 0 });
    }
  }

  return NextResponse.json({ players, picks, scrape_date: scrapeDate, is_superflex: isSuperFlex });
}
