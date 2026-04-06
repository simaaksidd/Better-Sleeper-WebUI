/**
 * ESPN College Football API client (undocumented, free, no auth).
 * Used for rookie data: headshots, college stats, and ID resolution.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Types ──

export interface CollegeSeasonStats {
  season: number;
  gamesPlayed: number;
  completions: number;
  attempts: number;
  passingYards: number;
  passingTds: number;
  interceptions: number;
  carries: number;
  rushingYards: number;
  rushingTds: number;
  receptions: number;
  receivingYards: number;
  receivingTds: number;
  fumblesLost: number;
  sacks: number;
  tacklesTotal: number;
  tacklesForLoss: number;
  passDefended: number;
  defInterceptions: number;
}

export interface CollegeGameStats {
  season: number;
  week: number;
  gameDate: string | null;
  opponent: string | null;
  result: string | null;
  completions: number;
  attempts: number;
  passingYards: number;
  passingTds: number;
  interceptions: number;
  carries: number;
  rushingYards: number;
  rushingTds: number;
  receptions: number;
  receivingYards: number;
  receivingTds: number;
  fumblesLost: number;
  sacks: number;
  tacklesTotal: number;
  tacklesForLoss: number;
  passDefended: number;
  defInterceptions: number;
}

// ── Headshot URL ──

export function collegeHeadshotUrl(espnCollegeId: string, w = 350, h = 254): string {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${espnCollegeId}.png&w=${w}&h=${h}`;
}

// ── Search: resolve player name + college → ESPN college athlete ID ──

export async function searchCollegeAthlete(
  firstName: string,
  lastName: string,
  college: string | null
): Promise<string | null> {
  const query = encodeURIComponent(`${firstName} ${lastName}`);
  const url = `https://site.api.espn.com/apis/common/v3/search?query=${query}&limit=10&type=player`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    // Search results are in data.results or data.items depending on the response shape
    const items: Array<Record<string, unknown>> =
      data.results?.[0]?.items || data.items || [];

    for (const item of items) {
      const type = item.type as string | undefined;
      if (type !== "athlete" && type !== "player") continue;
      // Accept NFL results too — ESPN IDs work across NFL and college endpoints

      // Match on college if we have it
      const description = (item.description as string) || "";
      if (college) {
        const normalizedCollege = college.toLowerCase();
        const normalizedDesc = description.toLowerCase();
        if (!normalizedDesc.includes(normalizedCollege)) continue;
      }

      // Extract ESPN ID from the item
      const id = item.id as string | undefined;
      if (id) return id;

      // Sometimes the ID is in the link
      const link = (item.link as string) || "";
      const match = link.match(/athletes\/(\d+)/);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ── Fetch season stats for a college athlete ──

export async function fetchCollegeSeasonStats(
  espnCollegeId: string
): Promise<CollegeSeasonStats[]> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/${espnCollegeId}/stats`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const seasons: CollegeSeasonStats[] = [];

    // The response has categories (passing, rushing, receiving, defense, etc.)
    // Each category has a "statistics" array (one entry per season/team)
    const categories: Array<Record<string, unknown>> =
      data.categories || [];

    // Build a map of season → stats
    const seasonMap = new Map<number, CollegeSeasonStats>();

    for (const category of categories) {
      const catName = ((category.displayName as string) || "").toLowerCase();
      const seasonEntries: Array<Record<string, unknown>> =
        (category.statistics as Array<Record<string, unknown>>) || [];

      for (const seasonEntry of seasonEntries) {
        // Season is a nested object: { year: number, displayName: string }
        const seasonObj = seasonEntry.season as Record<string, unknown> | undefined;
        const year = (seasonObj?.year as number) || (seasonEntry.year as number);
        if (!year) continue;

        if (!seasonMap.has(year)) {
          seasonMap.set(year, {
            season: year,
            gamesPlayed: 0,
            completions: 0,
            attempts: 0,
            passingYards: 0,
            passingTds: 0,
            interceptions: 0,
            carries: 0,
            rushingYards: 0,
            rushingTds: 0,
            receptions: 0,
            receivingYards: 0,
            receivingTds: 0,
            fumblesLost: 0,
            sacks: 0,
            tacklesTotal: 0,
            tacklesForLoss: 0,
            passDefended: 0,
            defInterceptions: 0,
          });
        }

        const stats = seasonMap.get(year)!;

        // Stats are a flat string array directly on the entry
        const statValues: string[] =
          (seasonEntry.stats as string[]) || [];

        if (statValues.length === 0) continue;

        // Map stat values based on category type and the column labels
        const labels: string[] =
          ((category.labels as string[]) || []).map((l: string) =>
            l.toLowerCase()
          );

        const getStatVal = (labelName: string): number => {
          const idx = labels.indexOf(labelName.toLowerCase());
          if (idx === -1) return 0;
          return parseFloat(statValues[idx]) || 0;
        };

        if (catName.includes("passing")) {
          stats.completions = getStatVal("CMP") || getStatVal("C/ATT");
          stats.attempts = getStatVal("ATT");
          stats.passingYards = getStatVal("YDS");
          stats.passingTds = getStatVal("TD");
          stats.interceptions = getStatVal("INT");
          stats.gamesPlayed = Math.max(stats.gamesPlayed, getStatVal("GP"));
        } else if (catName.includes("rushing")) {
          stats.carries = getStatVal("CAR") || getStatVal("ATT");
          stats.rushingYards = getStatVal("YDS");
          stats.rushingTds = getStatVal("TD");
          stats.fumblesLost = getStatVal("FUM") || getStatVal("FUML");
          stats.gamesPlayed = Math.max(stats.gamesPlayed, getStatVal("GP"));
        } else if (catName.includes("receiving")) {
          stats.receptions = getStatVal("REC");
          stats.receivingYards = getStatVal("YDS");
          stats.receivingTds = getStatVal("TD");
          stats.gamesPlayed = Math.max(stats.gamesPlayed, getStatVal("GP"));
        } else if (catName.includes("defense") || catName.includes("defensive")) {
          stats.tacklesTotal = getStatVal("TOT") || getStatVal("SOLO") + getStatVal("AST");
          stats.tacklesForLoss = getStatVal("TFL");
          stats.sacks = getStatVal("SACKS") || getStatVal("SACK");
          stats.passDefended = getStatVal("PD");
          stats.defInterceptions = getStatVal("INT");
          stats.gamesPlayed = Math.max(stats.gamesPlayed, getStatVal("GP"));
        }
      }
    }

    for (const [, stats] of seasonMap) {
      seasons.push(stats);
    }

    // Sort by season descending
    seasons.sort((a, b) => b.season - a.season);
    return seasons;
  } catch {
    return [];
  }
}

// ── Fetch per-game stats for a specific college season (lazy fetch) ──

export async function fetchCollegeGameLog(
  espnCollegeId: string,
  season: number
): Promise<CollegeGameStats[]> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/${espnCollegeId}/gamelog?season=${season}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const games: CollegeGameStats[] = [];

    // Root-level stat name arrays (used for all games)
    const rootNames: string[] = (data.names as string[]) || [];
    const events: Record<string, Record<string, unknown>> =
      data.events || {};
    const seasonTypes: Array<Record<string, unknown>> =
      data.seasonTypes || [];

    const gameMap = new Map<string, CollegeGameStats>();

    // Step 1: Build event metadata (date, opponent, result, week) from root events object
    const eventDetails = new Map<
      string,
      { date: string | null; opponent: string | null; result: string | null; week: number }
    >();

    for (const [eventId, evt] of Object.entries(events)) {
      eventDetails.set(eventId, {
        date: (evt.gameDate as string) || null,
        opponent: (evt.opponent as Record<string, unknown>)?.displayName as string || null,
        result: (evt.gameResult as string) || null,
        week: (evt.week as number) || 0,
      });
    }

    // Step 2: Process per-game stats from seasonTypes[].categories[].events[]
    // Root categories only have metadata (name, count) — no events.
    // The actual per-game stats are nested inside seasonTypes.
    const getValByName = (statValues: string[], statName: string): number => {
      const idx = rootNames.indexOf(statName);
      if (idx === -1) return 0;
      return parseFloat(statValues[idx]) || 0;
    };

    let fallbackWeek = 0;
    for (const st of seasonTypes) {
      const stCategories: Array<Record<string, unknown>> =
        (st.categories as Array<Record<string, unknown>>) || [];
      for (const cat of stCategories) {
        const catEvents: Array<Record<string, unknown>> =
          (cat.events as Array<Record<string, unknown>>) || [];
        for (const evt of catEvents) {
          const eventId = evt.eventId as string;
          if (!eventId) continue;

          const statValues: string[] = (evt.stats as string[]) || [];
          const detail = eventDetails.get(eventId);
          fallbackWeek++;

          if (!gameMap.has(eventId)) {
            gameMap.set(eventId, {
              season,
              week: detail?.week || fallbackWeek,
              gameDate: detail?.date || null,
              opponent: detail?.opponent || null,
              result: detail?.result || null,
              completions: 0,
              attempts: 0,
              passingYards: 0,
              passingTds: 0,
              interceptions: 0,
              carries: 0,
              rushingYards: 0,
              rushingTds: 0,
              receptions: 0,
              receivingYards: 0,
              receivingTds: 0,
              fumblesLost: 0,
              sacks: 0,
              tacklesTotal: 0,
              tacklesForLoss: 0,
              passDefended: 0,
              defInterceptions: 0,
            });
          }

          const game = gameMap.get(eventId)!;

          // Use root-level "names" array for unambiguous stat mapping
          // Names vary by player position (QB gets passing+rushing, WR gets receiving+rushing, etc.)
          game.completions = getValByName(statValues, "completions");
          game.attempts = getValByName(statValues, "passingAttempts");
          game.passingYards = getValByName(statValues, "passingYards");
          game.passingTds = getValByName(statValues, "passingTouchdowns");
          game.interceptions = getValByName(statValues, "interceptions");
          game.sacks = getValByName(statValues, "sacks");
          game.carries = getValByName(statValues, "rushingAttempts");
          game.rushingYards = getValByName(statValues, "rushingYards");
          game.rushingTds = getValByName(statValues, "rushingTouchdowns");
          game.receptions = getValByName(statValues, "receptions");
          game.receivingYards = getValByName(statValues, "receivingYards");
          game.receivingTds = getValByName(statValues, "receivingTouchdowns");
          game.fumblesLost = getValByName(statValues, "fumblesLost") || getValByName(statValues, "fumbles");
          game.tacklesTotal = getValByName(statValues, "totalTackles");
          game.tacklesForLoss = getValByName(statValues, "tacklesForLoss");
          game.passDefended = getValByName(statValues, "passesDefended");
          game.defInterceptions = getValByName(statValues, "defensiveInterceptions");
        }
      }
    }

    for (const [, game] of gameMap) {
      games.push(game);
    }

    // Sort by week
    games.sort((a, b) => a.week - b.week);
    return games;
  } catch {
    return [];
  }
}

// ── Batch resolve: find ESPN college IDs for an array of rookies ──

export async function resolveEspnCollegeIds(
  rookies: Array<{
    sleeper_id: string;
    first_name: string;
    last_name: string;
    college: string | null;
    espn_id: number | null;
  }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Resolve rookies that already have espn_id (no network call needed)
  const needsSearch: typeof rookies = [];
  for (const rookie of rookies) {
    if (rookie.espn_id) {
      results.set(rookie.sleeper_id, String(rookie.espn_id));
    } else {
      needsSearch.push(rookie);
    }
  }

  // Search remaining rookies in parallel batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < needsSearch.length; i += BATCH_SIZE) {
    const batch = needsSearch.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (rookie) => {
        const espnId = await searchCollegeAthlete(
          rookie.first_name,
          rookie.last_name,
          rookie.college
        );
        return { sleeper_id: rookie.sleeper_id, espnId };
      })
    );
    for (const { sleeper_id, espnId } of batchResults) {
      if (espnId) results.set(sleeper_id, espnId);
    }
    // Small delay between batches to be respectful to ESPN API
    if (i + BATCH_SIZE < needsSearch.length) await delay(50);
  }

  return results;
}
