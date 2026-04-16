import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runFullSync, getSyncProgress } from "@/lib/sync";

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(getSyncProgress());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let leagueId: string | undefined = body.leagueId;

    // If no leagueId provided (refresh), use the one from the database
    if (!leagueId) {
      const db = getDb();
      const row = db
        .prepare("SELECT league_id FROM league LIMIT 1")
        .get() as { league_id: string } | undefined;
      leagueId = row?.league_id;
    }

    if (!leagueId) {
      return NextResponse.json(
        { status: "error", message: "Missing leagueId" },
        { status: 400 }
      );
    }

    const result = await runFullSync(leagueId);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    console.error("[sync] error:", message);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
