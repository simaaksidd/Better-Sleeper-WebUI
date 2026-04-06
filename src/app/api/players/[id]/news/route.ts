import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchPlayerNews, type NewsItem, type PlayerNewsContext } from "@/lib/news-sources";

// In-memory cache: player_id → { news, sources, timestamp }
const cache = new Map<
  string,
  { news: NewsItem[]; sources: string[]; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const player = db
    .prepare(
      "SELECT full_name, first_name, last_name, team, espn_id, position FROM players WHERE player_id = ?"
    )
    .get(id) as {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    team: string | null;
    espn_id: number | null;
    position: string | null;
  } | undefined;

  if (!player || !player.full_name) {
    return NextResponse.json({ news: [], sources: [] });
  }

  // Check cache
  const cached = cache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      news: cached.news,
      sources: cached.sources,
    });
  }

  const ctx: PlayerNewsContext = {
    playerId: id,
    fullName: player.full_name,
    firstName: player.first_name || "",
    lastName: player.last_name || "",
    team: player.team,
    espnId: player.espn_id,
    position: player.position,
  };

  const result = await fetchPlayerNews(ctx);

  cache.set(id, {
    news: result.news,
    sources: result.sources,
    timestamp: Date.now(),
  });

  return NextResponse.json(result);
}
