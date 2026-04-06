import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ESPN_CFB_NEWS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news";

// In-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string }>;
}

interface NewsItem {
  headline: string;
  description: string;
  published: string;
  url: string | null;
  image: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Get player info for name-based search
  const player = db
    .prepare("SELECT full_name, college FROM players WHERE player_id = ?")
    .get(id) as { full_name: string; college: string | null } | undefined;

  if (!player) {
    return NextResponse.json({ news: [], source: "not_found" });
  }

  const cacheKey = `cfb_news_${id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ news: cached.data, source: "cached" });
  }

  try {
    // Fetch general CFB news and filter by player name or college
    const res = await fetch(`${ESPN_CFB_NEWS_URL}?limit=50`);
    if (!res.ok) {
      return NextResponse.json({ news: [], source: "espn_error" });
    }

    const data = await res.json();
    const articles: EspnArticle[] = data.articles || [];

    const playerName = player.full_name.toLowerCase();
    const lastName = playerName.split(" ").pop() || "";
    const college = (player.college || "").toLowerCase();

    // Filter to articles mentioning the player or their college
    const relevant = articles.filter((a) => {
      const text = `${a.headline || ""} ${a.description || ""}`.toLowerCase();
      return text.includes(playerName) || text.includes(lastName);
    });

    // If no player-specific news, include college team news
    const fallback =
      relevant.length > 0
        ? relevant
        : articles
            .filter((a) => {
              if (!college) return false;
              const text = `${a.headline || ""} ${a.description || ""}`.toLowerCase();
              return text.includes(college);
            })
            .slice(0, 5);

    const news: NewsItem[] = fallback.slice(0, 8).map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
    }));

    cache.set(cacheKey, { data: news, timestamp: Date.now() });

    return NextResponse.json({ news, source: "espn_cfb" });
  } catch {
    return NextResponse.json({ news: [], source: "espn_error" });
  }
}
