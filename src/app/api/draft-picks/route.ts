import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchTradedPicks, fetchDrafts } from "@/lib/sleeper-api";

interface DraftPick {
  season: string;
  round: number;
  pick_slot: number | null; // null when draft order not yet determined
  pick_label: string; // "1.01" when order known, "Rd 1" when not
  roster_id: number;
  owner_id: number;
  original_owner_name: string;
}

export async function GET() {
  try {
    const db = getDb();

    // Use the league ID from the database (the one that was actually synced)
    const leagueRow = db
      .prepare("SELECT league_id FROM league LIMIT 1")
      .get() as { league_id: string } | undefined;

    if (!leagueRow?.league_id) {
      return NextResponse.json({
        picks_by_owner: {},
        seasons: [],
        draft_rounds: 4,
        total_teams: 0,
      });
    }

    const leagueId = leagueRow.league_id;

    // Get all drafts — look for rookie drafts with draft_order per season
    const drafts = await fetchDrafts(leagueId);

    // Build a map of season -> draft_order for any rookie draft (player_type=1)
    // that has a draft_order set. Also track seasons whose rookie draft has
    // already completed — those picks have been resolved into actual players,
    // so they should not appear as separate assets.
    const draftOrderBySeason: Record<string, Record<string, number>> = {};
    const completedSeasons = new Set<string>();
    let draftRounds = 4;
    for (const d of drafts) {
      if (d.settings?.player_type === 1) {
        draftRounds = d.settings.rounds || 4;
        if (d.draft_order) {
          draftOrderBySeason[d.season] = d.draft_order;
        }
        if (d.status === "complete") {
          completedSeasons.add(d.season);
        }
      }
    }

    // Get rosters with user info
    const rosters = db
      .prepare(
        `SELECT r.roster_id, r.owner_id, u.display_name
         FROM rosters r
         LEFT JOIN users u ON r.owner_id = u.user_id`
      )
      .all() as Array<{
      roster_id: number;
      owner_id: string;
      display_name: string;
    }>;

    const totalTeams = rosters.length;
    const rosterToName: Record<number, string> = {};
    const ownerToRoster: Record<string, number> = {};
    for (const r of rosters) {
      rosterToName[r.roster_id] = r.display_name || "Unknown";
      ownerToRoster[r.owner_id] = r.roster_id;
    }

    // Fetch traded picks from Sleeper
    const tradedPicks = await fetchTradedPicks(leagueId);

    // Build a lookup of traded picks: "season-round-roster_id" -> owner_id
    const tradedMap: Record<string, number> = {};
    for (const tp of tradedPicks) {
      tradedMap[`${tp.season}-${tp.round}-${tp.roster_id}`] = tp.owner_id;
    }

    // Collect all seasons: from traded picks + any rookie draft seasons,
    // skipping seasons whose rookie draft is already complete.
    const seasons = new Set<string>();
    for (const tp of tradedPicks) {
      if (!completedSeasons.has(tp.season)) seasons.add(tp.season);
    }
    for (const d of drafts) {
      if (d.settings?.player_type === 1 && !completedSeasons.has(d.season)) {
        seasons.add(d.season);
      }
    }
    const sortedSeasons = Array.from(seasons).sort();

    // Build all picks grouped by owner_id
    const picksByOwner: Record<number, DraftPick[]> = {};

    for (const season of sortedSeasons) {
      // Check if draft order exists for this season
      const draftOrder = draftOrderBySeason[season];

      // Build roster_id -> slot mapping if draft order exists
      const rosterToSlot: Record<number, number> = {};
      if (draftOrder) {
        for (const [userId, slot] of Object.entries(draftOrder)) {
          const rosterId = ownerToRoster[userId];
          if (rosterId !== undefined) {
            rosterToSlot[rosterId] = slot;
          }
        }
      }

      const hasOrder = Object.keys(rosterToSlot).length > 0;

      for (let round = 1; round <= draftRounds; round++) {
        for (const r of rosters) {
          const rId = r.roster_id;

          const key = `${season}-${round}-${rId}`;
          const ownerId = tradedMap[key] ?? rId;

          const slot = hasOrder ? (rosterToSlot[rId] ?? null) : null;
          const pickLabel = slot !== null
            ? `${round}.${String(slot).padStart(2, "0")}`
            : `Rd ${round}`;

          const pick: DraftPick = {
            season,
            round,
            pick_slot: slot,
            pick_label: pickLabel,
            roster_id: rId,
            owner_id: ownerId,
            original_owner_name: rosterToName[rId],
          };

          if (!picksByOwner[ownerId]) picksByOwner[ownerId] = [];
          picksByOwner[ownerId].push(pick);
        }
      }
    }

    // Sort each owner's picks by season, then round, then slot (unordered last)
    for (const ownerId in picksByOwner) {
      picksByOwner[ownerId].sort((a, b) => {
        if (a.season !== b.season) return a.season.localeCompare(b.season);
        if (a.round !== b.round) return a.round - b.round;
        if (a.pick_slot === null && b.pick_slot === null) return 0;
        if (a.pick_slot === null) return 1;
        if (b.pick_slot === null) return -1;
        return a.pick_slot - b.pick_slot;
      });
    }

    return NextResponse.json({
      picks_by_owner: picksByOwner,
      seasons: sortedSeasons,
      draft_rounds: draftRounds,
      total_teams: totalTeams,
    });
  } catch (error) {
    console.error("Draft picks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch draft picks" },
      { status: 500 }
    );
  }
}
