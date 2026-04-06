import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ESPN_NEWS_URL =
  "https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players";

// In-memory cache: espn_id → { data, timestamp }
const cache = new Map<
  number,
  { data: NewsItem[]; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  story?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string }>;
}

interface NewsItem {
  headline: string;
  description: string;
  published: string;
  story: string | null;
  url: string | null;
  image: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Look up espn_id for this player
  const player = db
    .prepare("SELECT espn_id FROM players WHERE player_id = ?")
    .get(id) as { espn_id: number | null } | undefined;

  if (!player?.espn_id) {
    return NextResponse.json({ news: [], source: "no_espn_id" });
  }

  const espnId = player.espn_id;

  // Check cache
  const cached = cache.get(espnId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ news: cached.data, source: "espn_cached" });
  }

  try {
    const res = await fetch(
      `${ESPN_NEWS_URL}?limit=10&playerId=${espnId}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) {
      return NextResponse.json({ news: [], source: "espn_error" });
    }

    const data = await res.json();
    const articles: EspnArticle[] = data.feed || data.articles || [];

    const news: NewsItem[] = articles.map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      story: a.story || null,
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
    }));

    cache.set(espnId, { data: news, timestamp: Date.now() });

    return NextResponse.json({ news, source: "espn" });
  } catch {
    return NextResponse.json({ news: [], source: "espn_error" });
  }
}
