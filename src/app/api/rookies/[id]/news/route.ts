import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchRookieNews, type NewsItem, type RookieNewsContext } from "@/lib/news-sources";

// In-memory cache: player_id → { news, sources, timestamp }
const cache = new Map<
  string,
  { news: NewsItem[]; sources: string[]; timestamp: number }
>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const player = db
    .prepare(
      "SELECT full_name, first_name, last_name, team, college FROM players WHERE player_id = ?"
    )
    .get(id) as {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    team: string | null;
    college: string | null;
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

  const ctx: RookieNewsContext = {
    playerId: id,
    fullName: player.full_name,
    firstName: player.first_name || "",
    lastName: player.last_name || "",
    team: player.team,
    college: player.college,
  };

  const result = await fetchRookieNews(ctx);

  cache.set(id, {
    news: result.news,
    sources: result.sources,
    timestamp: Date.now(),
  });

  return NextResponse.json(result);
}
