import { NextResponse } from "next/server";
import { runFullSync, getSyncProgress } from "@/lib/sync";

export async function GET() {
  return NextResponse.json(getSyncProgress());
}

export async function POST() {
  try {
    const result = await runFullSync();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
