import { getDb } from "./db";
import {
  fetchNflState,
  fetchLeague,
  fetchUsers,
  fetchRosters,
  fetchAllPlayers,
  fetchTransactions,
  fetchDrafts,
  fetchDraftPicks,
  fetchSleeperBulkWeekStats,
} from "./sleeper-api";
import { fetchNflversePlayers, fetchPlayerStats, fetchCombineData } from "./nflverse";
import {
  resolveEspnCollegeIds,
  fetchCollegeSeasonStats,
} from "./espn-college";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let syncing = false;
let syncProgress = 0;
let syncPhase = "";
let completedWeight = 0;
const TOTAL_WEIGHT = 61;

export function isSyncing() {
  return syncing;
}

export function getSyncProgress() {
  return { syncing, progress: syncProgress, phase: syncPhase };
}

function updateProgress(additionalWeight: number, phase: string) {
  completedWeight += additionalWeight;
  syncProgress = Math.min(Math.round((completedWeight / TOTAL_WEIGHT) * 100), 99);
  syncPhase = phase;
}

export async function runFullSync(leagueId: string) {
  if (!leagueId) return { status: "error", message: "No league ID provided" };
  if (syncing) return { status: "already_running" };
  syncing = true;
  syncProgress = 0;
  syncPhase = "Starting...";
  completedWeight = 0;

  try {
    const db = getDb();

    // Clear league-specific tables to avoid stale data from a previous league
    // rosters must be deleted before users due to foreign key constraint
    db.exec("DELETE FROM rosters");
    db.exec("DELETE FROM users");
    db.exec("DELETE FROM transactions");
    db.exec("DELETE FROM drafts");

    // 1-5. Fetch league metadata + players in parallel
    updateProgress(0, "Fetching league data...");
    const [nflState, league, users, rosters, allPlayers] = await Promise.all([
      fetchNflState(),
      fetchLeague(leagueId),
      fetchUsers(leagueId),
      fetchRosters(leagueId),
      fetchAllPlayers(),
    ]);
    updateProgress(4, "Saving league data...");

    // Write to DB (synchronous, order matters: users before rosters for FK)
    db.prepare(
      `INSERT OR REPLACE INTO nfl_state (key, season, week, season_type, display_week, updated_at)
       VALUES ('current', ?, ?, ?, ?, unixepoch())`
    ).run(nflState.season, nflState.week, nflState.season_type, nflState.display_week);

    db.prepare(
      `INSERT OR REPLACE INTO league (league_id, name, season, total_rosters, roster_positions, scoring_settings, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())`
    ).run(league.league_id, league.name, league.season, league.total_rosters,
      JSON.stringify(league.roster_positions), JSON.stringify(league.scoring_settings));

    const upsertUser = db.prepare(
      `INSERT OR REPLACE INTO users (user_id, display_name, avatar, updated_at)
       VALUES (?, ?, ?, unixepoch())`
    );
    db.transaction(() => {
      for (const u of users) upsertUser.run(u.user_id, u.display_name, u.avatar);
    })();

    const upsertRoster = db.prepare(
      `INSERT OR REPLACE INTO rosters (roster_id, owner_id, players, starters, reserve, wins, losses, ties, fpts, fpts_decimal, fpts_against, fpts_against_decimal, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
    );
    db.transaction(() => {
      for (const r of rosters) {
        upsertRoster.run(
          r.roster_id, r.owner_id,
          JSON.stringify(r.players || []), JSON.stringify(r.starters || []),
          r.reserve ? JSON.stringify(r.reserve) : null,
          r.settings?.wins ?? 0, r.settings?.losses ?? 0, r.settings?.ties ?? 0,
          r.settings?.fpts ?? 0, r.settings?.fpts_decimal ?? 0,
          r.settings?.fpts_against ?? 0, r.settings?.fpts_against_decimal ?? 0
        );
      }
    })();

    const upsertPlayer = db.prepare(
      `INSERT OR REPLACE INTO players (player_id, first_name, last_name, full_name, position, team, age, height, weight, college, years_exp, injury_status, status, espn_id, number, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
    );
    db.transaction(() => {
      for (const [id, p] of Object.entries(allPlayers)) {
        const raw = p as Record<string, unknown>;
        upsertPlayer.run(
          id, p.first_name, p.last_name,
          p.full_name || `${p.first_name} ${p.last_name}`,
          p.position, p.team, p.age, p.height, p.weight, p.college,
          p.years_exp ?? 0, p.injury_status, p.status,
          (raw.espn_id as number) ?? null, (raw.number as number) ?? null
        );
      }
    })();
    updateProgress(5, "Fetching transactions...");

    // 6. Transactions (weeks 1-18)
    const upsertTx = db.prepare(
      `INSERT OR REPLACE INTO transactions (transaction_id, type, status, roster_ids, adds, drops, draft_picks, settings, created, week, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
    );
    const insertTxBatch = db.transaction(
      (
        txs: Array<{
          transaction_id: string;
          type: string;
          status: string;
          roster_ids: number[];
          adds: Record<string, number> | null;
          drops: Record<string, number> | null;
          draft_picks: unknown[];
          settings: Record<string, number> | null;
          created: number;
        }>,
        week: number
      ) => {
        for (const t of txs) {
          upsertTx.run(
            t.transaction_id,
            t.type,
            t.status,
            JSON.stringify(t.roster_ids),
            t.adds ? JSON.stringify(t.adds) : null,
            t.drops ? JSON.stringify(t.drops) : null,
            JSON.stringify(t.draft_picks || []),
            t.settings ? JSON.stringify(t.settings) : null,
            t.created,
            week
          );
        }
      }
    );

    // Fetch all 18 weeks in parallel
    const txResults = await Promise.allSettled(
      Array.from({ length: 18 }, (_, i) => fetchTransactions(leagueId, i + 1))
    );
    for (let i = 0; i < txResults.length; i++) {
      const result = txResults[i];
      if (result.status === "fulfilled") {
        insertTxBatch(result.value, i + 1);
      }
    }
    updateProgress(5, "Fetching drafts...");

    // 7. Drafts
    const drafts = await fetchDrafts(leagueId);
    const upsertDraftPick = db.prepare(
      `INSERT OR REPLACE INTO drafts (draft_id, round, pick_no, roster_id, player_id, picked_by, metadata, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`
    );
    for (const draft of drafts) {
      const picks = await fetchDraftPicks(draft.draft_id);
      const insertPicks = db.transaction(() => {
        for (const p of picks) {
          upsertDraftPick.run(
            draft.draft_id,
            p.round,
            p.pick_no,
            p.roster_id,
            p.player_id,
            p.picked_by,
            JSON.stringify(p.metadata)
          );
        }
      });
      insertPicks();
    }
    updateProgress(2, "Mapping player IDs...");

    // 8. Player ID Map — bridge Sleeper IDs to nflverse GSIS IDs
    // Three strategies in priority order:
    //   (a) gsis_id directly from Sleeper player data (~33% of active)
    //   (b) espn_id bridging: Sleeper espn_id → nflverse espn_id → gsis_id
    //   (c) Normalized name matching (strips Jr./III/II suffixes for comparison)
    const upsertIdMap = db.prepare(
      `INSERT OR REPLACE INTO player_id_map (gsis_id, sleeper_id, name, position, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())`
    );

    const nflversePlayers = await fetchNflversePlayers();

    // Build nflverse lookup maps
    const espnToGsis = new Map<string, { gsis_id: string; name: string | null; position: string | null }>();
    const nameToGsis = new Map<string, string>();
    for (const np of nflversePlayers) {
      if (!np.gsis_id) continue;
      if (np.espn_id) {
        espnToGsis.set(String(np.espn_id), {
          gsis_id: np.gsis_id,
          name: np.display_name,
          position: np.position,
        });
      }
      if (np.display_name) {
        // Normalize: strip suffixes, lowercase, remove punctuation
        const norm = normalizeName(np.display_name);
        // Store by name only (not position) since Sleeper and nflverse
        // sometimes disagree on position (e.g. Travis Hunter: WR vs CB)
        // Prefer the first match (most recent player) since nflverse data
        // is already sorted with active players first
        if (!nameToGsis.has(norm)) {
          nameToGsis.set(norm, np.gsis_id);
        }
      }
    }

    // (a) Sleeper players that already have gsis_id
    const mapped = new Set<string>();
    const insertAllMaps = db.transaction(() => {
      for (const [sleeperId, p] of Object.entries(allPlayers)) {
        const name = p.full_name || `${p.first_name} ${p.last_name}`;
        const gsis = (p as Record<string, unknown>).gsis_id as string | null;
        if (gsis) {
          upsertIdMap.run(gsis, sleeperId, name, p.position);
          mapped.add(sleeperId);
        }
      }

      // (b) espn_id bridge
      for (const [sleeperId, p] of Object.entries(allPlayers)) {
        if (mapped.has(sleeperId)) continue;
        const name = p.full_name || `${p.first_name} ${p.last_name}`;
        const espn = (p as Record<string, unknown>).espn_id as number | null;
        if (espn) {
          const match = espnToGsis.get(String(espn));
          if (match) {
            upsertIdMap.run(match.gsis_id, sleeperId, name, p.position);
            mapped.add(sleeperId);
          }
        }
      }

      // (c) Normalized name match
      for (const [sleeperId, p] of Object.entries(allPlayers)) {
        if (mapped.has(sleeperId)) continue;
        const name = p.full_name || `${p.first_name} ${p.last_name}`;
        if (!name) continue;
        const norm = normalizeName(name);
        const gsisId = nameToGsis.get(norm);
        if (gsisId) {
          upsertIdMap.run(gsisId, sleeperId, name, p.position);
          mapped.add(sleeperId);
        }
      }
    });
    insertAllMaps();
    updateProgress(5, "Syncing stats...");

    // 9. Player Stats (nflverse)
    // The league season may be ahead of available data (e.g. league says
    // "2025" but nflverse only has through 2024). Try the league season
    // first, then work backwards until we find data.
    const leagueSeason = parseInt(league.season);
    const seasons: number[] = [];
    for (let s = leagueSeason; s >= leagueSeason - 5 && s >= 2020; s--) {
      seasons.push(s);
    }
    const weightPerSeason = 30 / seasons.length;

    // Skip past seasons that already have data (they never change)
    const seasonsToFetch = seasons.filter((s) => {
      if (s < leagueSeason) {
        const row = db
          .prepare("SELECT COUNT(*) as cnt FROM player_stats WHERE season = ?")
          .get(s) as { cnt: number };
        if (row.cnt > 0) {
          console.log(`Skipping season ${s} stats (${row.cnt} rows already cached)`);
          return false;
        }
      }
      return true;
    });

    // Credit skipped seasons immediately
    const skippedCount = seasons.length - seasonsToFetch.length;
    if (skippedCount > 0) {
      completedWeight += skippedCount * weightPerSeason;
    }

    // Fetch remaining seasons in parallel
    await Promise.all(
      seasonsToFetch.map((s) =>
        syncSeasonStats(s, (_fraction, label) => {
          syncPhase = label;
        })
      )
    );
    completedWeight += seasonsToFetch.length * weightPerSeason;
    syncProgress = Math.min(
      Math.round((completedWeight / TOTAL_WEIGHT) * 100),
      99
    );

    // 10. Rookie data: combine results + ESPN college ID resolution + college season stats
    updateProgress(0, "Syncing combine data...");
    await syncRookieData(db, allPlayers);

    return { status: "ok", season: leagueSeason };
  } finally {
    syncing = false;
    syncProgress = 100;
    syncPhase = "";
    completedWeight = 0;
  }
}

async function syncSeasonStats(
  season: number,
  onProgress?: (fraction: number, label: string) => void
) {
  const db = getDb();

  const upsertStat = db.prepare(
    `INSERT OR REPLACE INTO player_stats (
      player_id, season, week, season_type, team, opponent_team,
      completions, attempts, passing_yards, passing_tds, passing_interceptions,
      sacks_suffered, sack_yards_lost, carries, rushing_yards, rushing_tds,
      targets, receptions, receiving_yards, receiving_tds,
      rushing_fumbles, rushing_fumbles_lost, receiving_fumbles, receiving_fumbles_lost,
      sack_fumbles, sack_fumbles_lost,
      fantasy_points, fantasy_points_ppr,
      fg_made, fg_att, pat_made, pat_att,
      source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
  );

  // Try nflverse first
  try {
    const stats = await fetchPlayerStats(season);
    if (stats) {
      const insertBatch = db.transaction(() => {
        for (const s of stats) {
          if (!s.player_id) continue;
          upsertStat.run(
            s.player_id,
            s.season,
            s.week,
            s.season_type || "REG",
            s.team,
            s.opponent_team,
            s.completions || 0,
            s.attempts || 0,
            s.passing_yards || 0,
            s.passing_tds || 0,
            s.passing_interceptions || 0,
            s.sacks_suffered || 0,
            s.sack_yards_lost || 0,
            s.carries || 0,
            s.rushing_yards || 0,
            s.rushing_tds || 0,
            s.targets || 0,
            s.receptions || 0,
            s.receiving_yards || 0,
            s.receiving_tds || 0,
            s.rushing_fumbles || 0,
            s.rushing_fumbles_lost || 0,
            s.receiving_fumbles || 0,
            s.receiving_fumbles_lost || 0,
            s.sack_fumbles || 0,
            s.sack_fumbles_lost || 0,
            s.fantasy_points || 0,
            s.fantasy_points_ppr || 0,
            s.fg_made || 0,
            s.fg_att || 0,
            s.pat_made || 0,
            s.pat_att || 0
          );
        }
      });
      insertBatch();
      onProgress?.(1, `Stats ${season} (nflverse)`);
      console.log(`Synced season ${season} from nflverse (${stats.length} rows)`);
      return;
    }
  } catch (e) {
    console.error(`nflverse failed for season ${season}:`, e);
  }

  // Fallback: Sleeper bulk stats API (week by week)
  console.log(`nflverse unavailable for ${season}, falling back to Sleeper bulk stats`);
  let totalRows = 0;

  // Fetch regular season (weeks 1-18) + postseason (weeks 1-4 → stored as 19-22)
  const weekPlan: { week: number; seasonType: "regular" | "post"; dbWeek: number }[] = [];
  for (let w = 1; w <= 18; w++) {
    weekPlan.push({ week: w, seasonType: "regular", dbWeek: w });
  }
  for (let w = 1; w <= 4; w++) {
    weekPlan.push({ week: w, seasonType: "post", dbWeek: 18 + w });
  }

  for (let i = 0; i < weekPlan.length; i++) {
    const { week, seasonType, dbWeek } = weekPlan[i];
    try {
      const entries = await fetchSleeperBulkWeekStats(season, week, seasonType);
      if (!entries || entries.length === 0) continue;

      // Filter to players who actually played (gp > 0)
      const played = entries.filter((e) => (e.stats.gp || 0) > 0);

      const insertBatch = db.transaction(() => {
        for (const e of played) {
          const s = e.stats;
          upsertStat.run(
            e.player_id, // sleeper_id as player_id
            season,
            dbWeek,
            seasonType === "post" ? "POST" : "REG",
            e.team,
            e.opponent,
            s.pass_cmp || 0,
            s.pass_att || 0,
            s.pass_yd || 0,
            s.pass_td || 0,
            s.pass_int || 0,
            s.pass_sack || 0,
            s.pass_sack_yds || 0,
            s.rush_att || 0,
            s.rush_yd || 0,
            s.rush_td || 0,
            s.rec_tgt || 0,
            s.rec || 0,
            s.rec_yd || 0,
            s.rec_td || 0,
            s.fum || 0,
            s.fum_lost || 0,
            0, // receiving_fumbles (Sleeper doesn't split)
            0, // receiving_fumbles_lost
            0, // sack_fumbles
            0, // sack_fumbles_lost
            s.pts_std || 0,
            s.pts_ppr || 0,
            s.fgm || 0,
            s.fga || 0,
            s.xpm || 0,
            s.xpa || 0,
            "sleeper"
          );
        }
      });
      insertBatch();
      totalRows += played.length;
    } catch (e) {
      console.error(`Sleeper bulk stats failed for ${season} ${seasonType} week ${week}:`, e);
    }
    onProgress?.((i + 1) / weekPlan.length, `Stats ${season} week ${dbWeek}/22`);
  }
  console.log(`Synced season ${season} from Sleeper bulk (${totalRows} rows)`);
}

type SleeperPlayerRecord = {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  years_exp: number;
  injury_status: string | null;
  status: string;
};

async function syncRookieData(
  db: import("better-sqlite3").Database,
  allPlayers: Record<string, SleeperPlayerRecord>
) {
  // (a) Download combine CSV → upsert into combine_results
  try {
    const combineRows = await fetchCombineData();
    if (combineRows && combineRows.length > 0) {
      const upsertCombine = db.prepare(
        `INSERT OR REPLACE INTO combine_results
         (player_name, pos, school, ht, wt, forty, vertical, bench, broad_jump, cone, shuttle,
          draft_year, draft_team, draft_round, draft_ovr, pfr_id, cfb_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
      );
      const insertCombineBatch = db.transaction(() => {
        for (const r of combineRows) {
          if (!r.player_name) continue;
          upsertCombine.run(
            r.player_name,
            r.pos,
            r.school,
            r.ht,
            r.wt,
            r.forty,
            r.vertical,
            r.bench,
            r.broad_jump,
            r.cone,
            r.shuttle,
            r.draft_year,
            r.draft_team,
            r.draft_round,
            r.draft_ovr,
            r.pfr_id,
            r.cfb_id
          );
        }
      });
      insertCombineBatch();
      console.log(`Synced ${combineRows.length} combine rows`);
    }
  } catch (e) {
    console.error("Failed to sync combine data:", e);
  }
  updateProgress(2, "Resolving rookie ESPN IDs...");

  // (b) Find rookies (years_exp=0) without espn_college_id
  const rookies: Array<{
    sleeper_id: string;
    first_name: string;
    last_name: string;
    college: string | null;
    espn_id: number | null;
  }> = [];

  const existingIds = new Set<string>();
  const existingRows = db
    .prepare("SELECT sleeper_id FROM player_id_map WHERE espn_college_id IS NOT NULL")
    .all() as Array<{ sleeper_id: string }>;
  for (const row of existingRows) {
    if (row.sleeper_id) existingIds.add(row.sleeper_id);
  }

  for (const [id, p] of Object.entries(allPlayers)) {
    if ((p.years_exp ?? 0) !== 0) continue;
    if (!p.position || !["QB", "RB", "WR", "TE"].includes(p.position)) continue;
    if (existingIds.has(id)) continue;
    rookies.push({
      sleeper_id: id,
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      college: p.college || null,
      espn_id: (p as Record<string, unknown>).espn_id as number | null,
    });
  }

  if (rookies.length > 0) {
    console.log(`Resolving ESPN college IDs for ${rookies.length} rookies...`);
    const resolved = await resolveEspnCollegeIds(rookies);

    const upsertCollegeId = db.prepare(
      `UPDATE player_id_map SET espn_college_id = ?, updated_at = unixepoch() WHERE sleeper_id = ?`
    );
    const insertCollegeId = db.prepare(
      `INSERT OR IGNORE INTO player_id_map (gsis_id, sleeper_id, name, position, espn_college_id, updated_at)
       VALUES (?, ?, ?, ?, ?, unixepoch())`
    );

    const saveIds = db.transaction(() => {
      for (const [sleeperId, espnCollegeId] of resolved) {
        // Try updating existing row first
        const result = upsertCollegeId.run(espnCollegeId, sleeperId);
        if (result.changes === 0) {
          // No existing row — insert with a placeholder gsis_id
          const player = allPlayers[sleeperId];
          const name = player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim();
          insertCollegeId.run(
            `rookie_${sleeperId}`,
            sleeperId,
            name,
            player?.position || null,
            espnCollegeId
          );
        }
      }
    });
    saveIds();
    console.log(`Resolved ${resolved.size} ESPN college IDs`);
  }
  updateProgress(5, "Fetching college stats...");

  // (c) Fetch college season stats for rookies with espn_college_id
  const rookiesWithEspn = db
    .prepare(
      `SELECT sleeper_id, espn_college_id FROM player_id_map
       WHERE espn_college_id IS NOT NULL AND sleeper_id IS NOT NULL`
    )
    .all() as Array<{ sleeper_id: string; espn_college_id: string }>;

  // Only fetch for players who are actually rookies
  const rookieIds = new Set<string>();
  for (const [id, p] of Object.entries(allPlayers)) {
    if ((p.years_exp ?? 0) === 0) rookieIds.add(id);
  }

  // Only consider rows with actual data as cached — all-zero rows from the
  // broken parser should be re-fetched
  const alreadyCached = new Set<string>();
  const cachedRows = db
    .prepare(
      `SELECT DISTINCT espn_college_id FROM college_stats_season
       WHERE (completions + attempts + passing_yards + carries + rushing_yards +
              receptions + receiving_yards + tackles_total + sacks) > 0`
    )
    .all() as Array<{ espn_college_id: string }>;
  for (const row of cachedRows) {
    alreadyCached.add(row.espn_college_id);
  }

  const upsertCollegeSeason = db.prepare(
    `INSERT OR REPLACE INTO college_stats_season
     (espn_college_id, season, games_played, completions, attempts, passing_yards, passing_tds,
      interceptions, carries, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds,
      fumbles_lost, sacks, tackles_total, tackles_for_loss, pass_defended, def_interceptions, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
  );

  // Filter to rookies that need fetching
  const toFetch = rookiesWithEspn.filter(
    (row) => rookieIds.has(row.sleeper_id) && !alreadyCached.has(row.espn_college_id)
  );

  // Fetch college stats in parallel batches of 5
  let statsFetched = 0;
  const BATCH_SIZE = 5;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (row) => {
        try {
          const seasons = await fetchCollegeSeasonStats(row.espn_college_id);
          return { espn_college_id: row.espn_college_id, seasons };
        } catch (e) {
          console.error(`Failed to fetch college stats for ${row.espn_college_id}:`, e);
          return { espn_college_id: row.espn_college_id, seasons: [] as import("./espn-college").CollegeSeasonStats[] };
        }
      })
    );

    // Write batch results to DB
    for (const { espn_college_id, seasons } of batchResults) {
      if (seasons.length === 0) continue;
      db.transaction(() => {
        for (const s of seasons) {
          upsertCollegeSeason.run(
            espn_college_id, s.season, s.gamesPlayed,
            s.completions, s.attempts, s.passingYards, s.passingTds,
            s.interceptions, s.carries, s.rushingYards, s.rushingTds,
            s.receptions, s.receivingYards, s.receivingTds,
            s.fumblesLost, s.sacks, s.tacklesTotal, s.tacklesForLoss,
            s.passDefended, s.defInterceptions
          );
        }
      })();
      statsFetched++;
    }

    updateProgress(
      (BATCH_SIZE * 3) / Math.max(toFetch.length, 1),
      `College stats ${statsFetched}/${toFetch.length}`
    );
    // Small delay between batches
    if (i + BATCH_SIZE < toFetch.length) await delay(50);
  }
  console.log(`Fetched college season stats for ${statsFetched} rookies`);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\.?\b/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
