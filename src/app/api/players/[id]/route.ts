import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const player = db
    .prepare("SELECT * FROM players WHERE player_id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({
    player_id: player.player_id,
    first_name: player.first_name,
    last_name: player.last_name,
    full_name: player.full_name,
    position: player.position,
    team: player.team,
    age: player.age,
    height: player.height,
    weight: player.weight,
    college: player.college,
    years_exp: player.years_exp,
    injury_status: player.injury_status,
    status: player.status,
    espn_id: player.espn_id ?? null,
    number: player.number ?? null,
  });
}
