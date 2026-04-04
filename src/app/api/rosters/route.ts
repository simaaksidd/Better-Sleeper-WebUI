import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const rosters = db
    .prepare(
      `SELECT r.roster_id, r.owner_id, r.players, r.starters, r.reserve,
              r.wins, r.losses, r.ties, r.fpts, r.fpts_decimal,
              r.fpts_against, r.fpts_against_decimal,
              u.display_name, u.avatar
       FROM rosters r
       LEFT JOIN users u ON r.owner_id = u.user_id
       ORDER BY r.wins DESC, (r.fpts + r.fpts_decimal / 100.0) DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const result = rosters.map((r) => {
    const playerIds: string[] = JSON.parse(r.players as string);
    const starterIds: string[] = JSON.parse(r.starters as string);
    const reserveIds: string[] = r.reserve
      ? JSON.parse(r.reserve as string)
      : [];

    // Fetch player details for all players on this roster
    const players = playerIds.map((pid) => {
      const p = db
        .prepare(
          "SELECT player_id, full_name, first_name, last_name, position, team, injury_status, years_exp, age FROM players WHERE player_id = ?"
        )
        .get(pid) as Record<string, unknown> | undefined;

      return p
        ? {
            player_id: p.player_id,
            full_name: p.full_name || `${p.first_name} ${p.last_name}`,
            first_name: p.first_name,
            last_name: p.last_name,
            position: p.position || "Unknown",
            team: p.team,
            injury_status: p.injury_status,
            years_exp: p.years_exp ?? 0,
            age: p.age,
          }
        : {
            player_id: pid,
            full_name: pid,
            first_name: "",
            last_name: pid,
            position: "Unknown",
            team: null,
            injury_status: null,
            years_exp: 0,
            age: null,
          };
    });

    return {
      roster_id: r.roster_id,
      owner_id: r.owner_id,
      display_name: r.display_name || "Unknown",
      avatar: r.avatar,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      fpts: (r.fpts as number) + (r.fpts_decimal as number) / 100,
      fpts_against:
        (r.fpts_against as number) +
        (r.fpts_against_decimal as number) / 100,
      players,
      starters: starterIds,
      reserve: reserveIds,
    };
  });

  return NextResponse.json(result);
}
