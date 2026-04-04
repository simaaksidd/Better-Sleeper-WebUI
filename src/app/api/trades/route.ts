import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const trades = db
    .prepare(
      `SELECT * FROM transactions WHERE type = 'trade' AND status = 'complete'
       ORDER BY created DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const resolved = trades.map((t) => {
    const rosterIds: number[] = JSON.parse(t.roster_ids as string);
    const adds: Record<string, number> | null = t.adds
      ? JSON.parse(t.adds as string)
      : null;
    const draftPicks: Array<{
      season: string;
      round: number;
      roster_id: number;
      previous_owner_id: number;
      owner_id: number;
    }> = JSON.parse(t.draft_picks as string);

    const sides = rosterIds.map((rid) => {
      const user = db
        .prepare(
          `SELECT u.display_name, u.avatar FROM rosters r
           JOIN users u ON r.owner_id = u.user_id
           WHERE r.roster_id = ?`
        )
        .get(rid) as Record<string, unknown> | undefined;

      // Players this roster received
      const playersReceived: Array<Record<string, unknown>> = [];
      if (adds) {
        for (const [playerId, toRosterId] of Object.entries(adds)) {
          if (toRosterId === rid) {
            const p = db
              .prepare(
                "SELECT player_id, full_name, first_name, last_name, position, team FROM players WHERE player_id = ?"
              )
              .get(playerId) as Record<string, unknown> | undefined;
            playersReceived.push(
              p || {
                player_id: playerId,
                full_name: playerId,
                position: "Unknown",
                team: null,
              }
            );
          }
        }
      }

      // Draft picks this roster received
      const picksReceived = draftPicks
        .filter((dp) => dp.owner_id === rid)
        .map((dp) => {
          const origOwner = db
            .prepare(
              `SELECT u.display_name FROM rosters r
               JOIN users u ON r.owner_id = u.user_id
               WHERE r.roster_id = ?`
            )
            .get(dp.roster_id) as Record<string, unknown> | undefined;
          return {
            season: dp.season,
            round: dp.round,
            original_owner: (origOwner?.display_name as string) || `Team ${dp.roster_id}`,
          };
        });

      return {
        roster_id: rid,
        display_name: (user?.display_name as string) || `Team ${rid}`,
        avatar: (user?.avatar as string) || null,
        players_received: playersReceived,
        draft_picks_received: picksReceived,
      };
    });

    return {
      transaction_id: t.transaction_id,
      created: t.created,
      week: t.week,
      sides,
    };
  });

  return NextResponse.json(resolved);
}
