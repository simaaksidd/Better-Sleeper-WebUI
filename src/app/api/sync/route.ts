import { NextResponse } from "next/server";
import { runFullSync, getSyncProgress } from "@/lib/sync";

export async function GET() {
  return NextResponse.json(getSyncProgress());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const leagueId = body.leagueId;
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
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
