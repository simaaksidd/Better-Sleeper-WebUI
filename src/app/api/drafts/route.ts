import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const picks = db
    .prepare(
      `SELECT d.*, p.full_name, p.position, p.team,
              u.display_name, u.avatar
       FROM drafts d
       LEFT JOIN players p ON d.player_id = p.player_id
       LEFT JOIN rosters r ON d.roster_id = r.roster_id
       LEFT JOIN users u ON r.owner_id = u.user_id
       ORDER BY d.pick_no ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return NextResponse.json(
    picks.map((p) => ({
      draft_id: p.draft_id,
      round: p.round,
      pick_no: p.pick_no,
      roster_id: p.roster_id,
      player_id: p.player_id,
      picked_by: p.picked_by,
      full_name: p.full_name,
      position: p.position,
      team: p.team,
      display_name: p.display_name || `Team ${p.roster_id}`,
      avatar: p.avatar,
      metadata: p.metadata ? JSON.parse(p.metadata as string) : null,
    }))
  );
}
