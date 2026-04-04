import { NextResponse } from "next/server";
import { SLEEPER_STATS_BASE } from "@/lib/constants";
import { getDb } from "@/lib/db";

// In-memory cache: team → { data, timestamp }
const cache = new Map<
  string,
  { data: ResolvedDepthChart; timestamp: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface DepthChartPlayer {
  player_id: string;
  full_name: string;
  position: string;
}

type ResolvedDepthChart = Record<string, DepthChartPlayer[]>;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const { team } = await params;
  const teamUpper = team.toUpperCase();

  // Check cache
  const cached = cache.get(teamUpper);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ depth_chart: cached.data, source: "cached" });
  }

  try {
    const res = await fetch(
      `${SLEEPER_STATS_BASE}/players/nfl/${teamUpper}/depth_chart`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) {
      return NextResponse.json({ depth_chart: {}, source: "error" });
    }

    const raw: Record<string, string[]> = await res.json();

    // Resolve player IDs to names using the DB
    const db = getDb();
    const allIds = [...new Set(Object.values(raw).flat())];
    const playerMap = new Map<string, { full_name: string; position: string }>();

    if (allIds.length > 0) {
      const placeholders = allIds.map(() => "?").join(",");
      const rows = db
        .prepare(
          `SELECT player_id, full_name, position FROM players WHERE player_id IN (${placeholders})`
        )
        .all(...allIds) as Array<{
        player_id: string;
        full_name: string;
        position: string;
      }>;
      for (const r of rows) {
        playerMap.set(r.player_id, {
          full_name: r.full_name,
          position: r.position,
        });
      }
    }

    const resolved: ResolvedDepthChart = {};
    for (const [pos, ids] of Object.entries(raw)) {
      resolved[pos] = ids.map((id) => ({
        player_id: id,
        full_name: playerMap.get(id)?.full_name || `#${id}`,
        position: playerMap.get(id)?.position || pos,
      }));
    }

    cache.set(teamUpper, { data: resolved, timestamp: Date.now() });
    return NextResponse.json({ depth_chart: resolved, source: "sleeper" });
  } catch {
    return NextResponse.json({ depth_chart: {}, source: "error" });
  }
}
