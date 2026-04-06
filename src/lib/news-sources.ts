import { XMLParser } from "fast-xml-parser";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NewsItem {
  headline: string;
  description: string;
  published: string;
  story: string | null;
  url: string | null;
  image: string | null;
  source: string;
}

export interface PlayerNewsContext {
  playerId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  team: string | null;
  espnId: number | null;
  position: string | null;
}

export interface RookieNewsContext {
  playerId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  team: string | null;
  college: string | null;
}

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  story?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ESPN_FANTASY_URL =
  "https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players";
const ESPN_SITE_NFL_NEWS =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news";
const ESPN_CFB_NEWS =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news";

const ESPN_NFL_TEAM_IDS: Record<string, number> = {
  ARI: 22, ATL: 1, BAL: 33, BUF: 2, CAR: 29, CHI: 3,
  CIN: 4, CLE: 5, DAL: 6, DEN: 7, DET: 8, GB: 9,
  HOU: 34, IND: 11, JAX: 30, KC: 12, LAC: 24, LAR: 14,
  LV: 13, MIA: 15, MIN: 16, NE: 17, NO: 18, NYG: 19,
  NYJ: 20, PHI: 21, PIT: 23, SEA: 26, SF: 25, TB: 27,
  TEN: 10, WAS: 28,
};

const COMMON_LAST_NAMES = new Set([
  "smith", "johnson", "williams", "jones", "brown", "davis", "wilson",
  "moore", "taylor", "thomas", "jackson", "white", "harris", "martin",
  "thompson", "robinson", "clark", "lewis", "lee", "walker", "hall",
  "allen", "young", "king", "wright", "hill", "green", "adams",
  "baker", "nelson", "carter", "mitchell", "roberts", "turner", "phillips",
  "campbell", "parker", "evans", "edwards", "collins", "stewart", "morris",
  "reed", "cook", "morgan", "bell", "murphy", "bailey", "cooper",
  "richardson", "cox", "ward", "peterson", "gray", "watson", "brooks",
]);

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Source 1: ESPN Fantasy News                                        */
/* ------------------------------------------------------------------ */

async function fetchEspnFantasyNews(espnId: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `${ESPN_FANTASY_URL}?limit=10&playerId=${espnId}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const articles: EspnArticle[] = data.feed || data.articles || [];

    return articles.map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      story: a.story || null,
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
      source: "ESPN",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Source 2: ESPN Athlete News (site API)                              */
/* ------------------------------------------------------------------ */

async function fetchEspnAthleteNews(espnId: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `${ESPN_SITE_NFL_NEWS}?athlete=${espnId}&limit=10`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const articles: EspnArticle[] = data.articles || [];

    return articles.map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      story: a.story || null,
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
      source: "ESPN",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Source 3: ESPN Team News (filtered by player name)                  */
/* ------------------------------------------------------------------ */

async function fetchEspnTeamNews(
  team: string,
  firstName: string,
  lastName: string
): Promise<NewsItem[]> {
  const teamId = ESPN_NFL_TEAM_IDS[team];
  if (!teamId) return [];

  try {
    const res = await fetch(
      `${ESPN_SITE_NFL_NEWS}?team=${teamId}&limit=30`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const articles: EspnArticle[] = data.articles || [];

    const first = firstName.toLowerCase();
    const last = lastName.toLowerCase();
    const needsFullName = COMMON_LAST_NAMES.has(last);

    const relevant = articles.filter((a) => {
      const text = `${a.headline || ""} ${a.description || ""}`.toLowerCase();
      if (needsFullName) {
        return text.includes(first) && text.includes(last);
      }
      return text.includes(last);
    });

    return relevant.slice(0, 8).map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      story: a.story || null,
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
      source: "ESPN",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Source 4: Google News RSS                                           */
/* ------------------------------------------------------------------ */

const xmlParser = new XMLParser({ ignoreAttributes: false });

async function fetchGoogleNewsRss(fullName: string, keyword = "NFL"): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent(`"${fullName}" ${keyword}`);
    const res = await fetch(
      `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: { "User-Agent": "SleeperUI/1.0" },
        next: { revalidate: 600 },
      }
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);

    const items = parsed?.rss?.channel?.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];

    return list.slice(0, 8).map((item: Record<string, string>) => ({
      headline: item.title || "",
      description: (item.description || "").replace(/<[^>]*>/g, "").slice(0, 300),
      published: item.pubDate || "",
      story: null,
      url: item.link || null,
      image: null,
      source: "Google News",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Deduplication                                                      */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  "a", "the", "in", "at", "for", "of", "to", "is", "and", "on",
  "an", "by", "with", "from", "as", "has", "was", "are", "or",
  "its", "his", "her", "be", "not", "but", "that", "this", "will",
]);

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  return new Set(words.filter((w) => w.length > 1 && !STOP_WORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return url;
  }
}

function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const result: NewsItem[] = [];

  for (const item of items) {
    const isDuplicate = result.some((existing) => {
      // URL match
      if (item.url && existing.url) {
        if (normalizeUrl(item.url) === normalizeUrl(existing.url)) return true;
      }
      // Headline similarity
      const tokensA = tokenize(existing.headline);
      const tokensB = tokenize(item.headline);
      return jaccardSimilarity(tokensA, tokensB) > 0.7;
    });

    if (!isDuplicate) {
      result.push(item);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

const MIN_ARTICLES = 3;
const MAX_ARTICLES = 10;

export async function fetchPlayerNews(
  ctx: PlayerNewsContext
): Promise<{ news: NewsItem[]; sources: string[] }> {
  // DEF/ST players — no meaningful news
  if (ctx.position === "DEF") {
    return { news: [], sources: [] };
  }

  const results: NewsItem[] = [];
  const sourcesUsed = new Set<string>();

  // Source 1: ESPN Fantasy News
  if (ctx.espnId) {
    const items = await fetchEspnFantasyNews(ctx.espnId);
    results.push(...items);
    if (items.length > 0) sourcesUsed.add("ESPN");
  }

  // Source 2: ESPN Athlete News (different pipeline, same ID)
  if (results.length < MIN_ARTICLES && ctx.espnId) {
    const items = await fetchEspnAthleteNews(ctx.espnId);
    results.push(...items);
    if (items.length > 0) sourcesUsed.add("ESPN");
  }

  // Source 3: ESPN Team News (name-matched)
  if (results.length < MIN_ARTICLES && ctx.team) {
    const items = await fetchEspnTeamNews(
      ctx.team,
      ctx.firstName,
      ctx.lastName
    );
    results.push(...items);
    if (items.length > 0) sourcesUsed.add("ESPN");
  }

  // Source 4: Google News RSS (broadest fallback)
  if (results.length < MIN_ARTICLES) {
    const items = await fetchGoogleNewsRss(ctx.fullName);
    results.push(...items);
    if (items.length > 0) sourcesUsed.add("Google News");
  }

  // Deduplicate and sort by published date (newest first)
  let news = deduplicateNews(results);
  news.sort((a, b) => {
    const da = new Date(a.published).getTime() || 0;
    const db = new Date(b.published).getTime() || 0;
    return db - da;
  });
  news = news.slice(0, MAX_ARTICLES);

  return { news, sources: [...sourcesUsed] };
}

/* ------------------------------------------------------------------ */
/*  Source: ESPN College Football News (name-filtered)                  */
/* ------------------------------------------------------------------ */

async function fetchEspnCfbNews(
  fullName: string,
  lastName: string,
  college: string | null
): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${ESPN_CFB_NEWS}?limit=50`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const articles: EspnArticle[] = data.articles || [];

    const nameLower = fullName.toLowerCase();
    const lastLower = lastName.toLowerCase();

    // Filter to articles mentioning the player
    const relevant = articles.filter((a) => {
      const text = `${a.headline || ""} ${a.description || ""}`.toLowerCase();
      return text.includes(nameLower) || text.includes(lastLower);
    });

    // Fallback: articles mentioning their college
    const results =
      relevant.length > 0
        ? relevant
        : college
          ? articles
              .filter((a) => {
                const text =
                  `${a.headline || ""} ${a.description || ""}`.toLowerCase();
                return text.includes(college.toLowerCase());
              })
              .slice(0, 5)
          : [];

    return results.slice(0, 8).map((a) => ({
      headline: a.headline || "",
      description: a.description || "",
      published: a.published || "",
      story: a.story || null,
      url: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
      source: "ESPN",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Rookie Orchestrator                                                */
/* ------------------------------------------------------------------ */

export async function fetchRookieNews(
  ctx: RookieNewsContext
): Promise<{ news: NewsItem[]; sources: string[] }> {
  const results: NewsItem[] = [];
  const sourcesUsed = new Set<string>();

  // Source 1: ESPN College Football News (existing approach, extracted)
  const cfbItems = await fetchEspnCfbNews(
    ctx.fullName,
    ctx.lastName,
    ctx.college
  );
  results.push(...cfbItems);
  if (cfbItems.length > 0) sourcesUsed.add("ESPN");

  // Source 2: ESPN NFL Team News (if rookie has been drafted to a team)
  if (results.length < MIN_ARTICLES && ctx.team) {
    const teamItems = await fetchEspnTeamNews(
      ctx.team,
      ctx.firstName,
      ctx.lastName
    );
    results.push(...teamItems);
    if (teamItems.length > 0) sourcesUsed.add("ESPN");
  }

  // Source 3: Google News RSS (broad fallback)
  if (results.length < MIN_ARTICLES) {
    const googleItems = await fetchGoogleNewsRss(ctx.fullName, "NFL draft");
    results.push(...googleItems);
    if (googleItems.length > 0) sourcesUsed.add("Google News");
  }

  let news = deduplicateNews(results);
  news.sort((a, b) => {
    const da = new Date(a.published).getTime() || 0;
    const db = new Date(b.published).getTime() || 0;
    return db - da;
  });
  news = news.slice(0, MAX_ARTICLES);

  return { news, sources: [...sourcesUsed] };
}
