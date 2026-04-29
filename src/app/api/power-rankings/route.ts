import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchTradedPicks, fetchDrafts } from "@/lib/sleeper-api";
import {
  getContenderTier,
  computeTeamNeeds,
  assignRanks,
  lookupPickValue,
} from "@/lib/power-rankings";
import { getLeagueValueConfig } from "@/lib/league-values";

// ── Types ──────────────────────────────────────────────────────

interface PlayerEntry {
  name: string;
  value: number;
  is_starter: boolean;
  sleeper_id: string;
}

interface PickEntry {
  label: string;
  value: number;
  via: string | null;
}

interface PositionGroup {
  rank: number;
  value: number;
  avg_age: number;
  players: PlayerEntry[];
}

interface DraftGroup {
  rank: number;
  value: number;
  picks: PickEntry[];
}

interface TeamRanking {
  roster_id: number;
  owner_name: string;
  team_name: string;
  avatar: string | null;
  contender_tier: string;
  contender_color: string;
  contender_bg_color: string;
  overall_rank: number;
  overall_value: number;
  starter_rank: number;
  starter_value: number;
  avg_age: number;
  team_needs: string[];
  positions: {
    QB: PositionGroup;
    RB: PositionGroup;
    WR: PositionGroup;
    TE: PositionGroup;
    DRAFT: DraftGroup;
  };
}

// ── Route Handler ──────────────────────────────────────────────

export async function GET() {
  try {
    const db = getDb();

    // 1. Get league_id (the value-column selection is shared with /api/values
    // via getLeagueValueConfig — keeps trade/team views and power rankings
    // in lockstep).
    const leagueRow = db
      .prepare("SELECT league_id FROM league LIMIT 1")
      .get() as { league_id: string } | undefined;

    if (!leagueRow?.league_id) {
      return NextResponse.json({ teams: [] });
    }

    const leagueId = leagueRow.league_id;
    const { valueColumn: valueCol } = getLeagueValueConfig(db);

    // 2. Dynasty values for players (keyed by sleeper_id)
    const dvRows = db
      .prepare(
        `SELECT sleeper_id, ${valueCol} as value, age FROM dynasty_values WHERE sleeper_id IS NOT NULL`
      )
      .all() as Array<{ sleeper_id: string; value: number; age: number | null }>;

    const playerValueMap = new Map<string, number>();
    for (const r of dvRows) {
      playerValueMap.set(r.sleeper_id, r.value ?? 0);
    }

    // 3. Dynasty values for picks (keyed by label)
    const pickDvRows = db
      .prepare(
        `SELECT player, ${valueCol} as value FROM dynasty_values WHERE is_pick = 1`
      )
      .all() as Array<{ player: string; value: number }>;

    const pickValueMap = new Map<string, number>();
    for (const r of pickDvRows) {
      pickValueMap.set(r.player, r.value ?? 0);
    }

    // 4. Rosters + users
    const rosterRows = db
      .prepare(
        `SELECT r.roster_id, r.owner_id, r.players, r.starters,
                u.display_name, u.avatar
         FROM rosters r
         LEFT JOIN users u ON r.owner_id = u.user_id`
      )
      .all() as Array<{
      roster_id: number;
      owner_id: string;
      players: string;
      starters: string;
      display_name: string | null;
      avatar: string | null;
    }>;

    const totalTeams = rosterRows.length;
    const rosterToName: Record<number, string> = {};
    const ownerToRoster: Record<string, number> = {};
    for (const r of rosterRows) {
      rosterToName[r.roster_id] = r.display_name || "Unknown";
      ownerToRoster[r.owner_id] = r.roster_id;
    }

    // 5. Players lookup
    const playerRows = db
      .prepare(
        "SELECT player_id, full_name, position, age, team FROM players"
      )
      .all() as Array<{
      player_id: string;
      full_name: string;
      position: string | null;
      age: number | null;
      team: string | null;
    }>;

    const playerInfoMap = new Map<
      string,
      { full_name: string; position: string | null; age: number | null }
    >();
    for (const p of playerRows) {
      playerInfoMap.set(p.player_id, {
        full_name: p.full_name,
        position: p.position,
        age: p.age,
      });
    }

    // 6. Pick ownership (adapted from draft-picks route)
    const [tradedPicks, drafts] = await Promise.all([
      fetchTradedPicks(leagueId),
      fetchDrafts(leagueId),
    ]);

    const draftOrderBySeason: Record<string, Record<string, number>> = {};
    const completedSeasons = new Set<string>();
    let draftRounds = 4;
    for (const d of drafts) {
      if (d.settings?.player_type === 1) {
        draftRounds = d.settings.rounds || 4;
        if (d.draft_order) {
          draftOrderBySeason[d.season] = d.draft_order;
        }
        if (d.status === "complete") completedSeasons.add(d.season);
      }
    }

    const tradedMap: Record<string, number> = {};
    for (const tp of tradedPicks) {
      tradedMap[`${tp.season}-${tp.round}-${tp.roster_id}`] = tp.owner_id;
    }

    const seasons = new Set<string>();
    for (const tp of tradedPicks) {
      if (!completedSeasons.has(tp.season)) seasons.add(tp.season);
    }
    for (const d of drafts) {
      if (d.settings?.player_type === 1 && !completedSeasons.has(d.season)) {
        seasons.add(d.season);
      }
    }

    // Build picks grouped by current owner (roster_id)
    interface OwnedPick {
      season: string;
      round: number;
      slot: number | null;
      label: string;
      original_owner_name: string;
      is_traded: boolean;
    }

    const picksByRosterId: Record<number, OwnedPick[]> = {};

    for (const season of seasons) {
      const draftOrder = draftOrderBySeason[season];
      const rosterToSlot: Record<number, number> = {};
      if (draftOrder) {
        for (const [userId, slot] of Object.entries(draftOrder)) {
          const rosterId = ownerToRoster[userId];
          if (rosterId !== undefined) rosterToSlot[rosterId] = slot;
        }
      }
      const hasOrder = Object.keys(rosterToSlot).length > 0;

      for (let round = 1; round <= draftRounds; round++) {
        for (const r of rosterRows) {
          const rId = r.roster_id;
          const key = `${season}-${round}-${rId}`;
          const ownerId = tradedMap[key] ?? rId;

          const slot = hasOrder ? (rosterToSlot[rId] ?? null) : null;
          const pickLabel =
            slot !== null
              ? `${season} Pick ${round}.${String(slot).padStart(2, "0")}`
              : `${season} Round ${round}`;

          const pick: OwnedPick = {
            season,
            round,
            slot,
            label: pickLabel,
            original_owner_name: rosterToName[rId],
            is_traded: ownerId !== rId,
          };

          if (!picksByRosterId[ownerId]) picksByRosterId[ownerId] = [];
          picksByRosterId[ownerId].push(pick);
        }
      }
    }

    // ── Per-team computation ───────────────────────────────────

    interface TeamBuild {
      roster_id: number;
      owner_name: string;
      avatar: string | null;
      starters: Set<string>;
      posGroups: Record<string, { players: PlayerEntry[]; ages: number[] }>;
      draftPicks: PickEntry[];
      draftValue: number;
      overallValue: number;
      starterValue: number;
      avgAge: number;
    }

    const teamBuilds: TeamBuild[] = [];

    for (const roster of rosterRows) {
      const playerIds: string[] = JSON.parse(roster.players || "[]");
      const starterIds = new Set<string>(
        JSON.parse(roster.starters || "[]") as string[]
      );

      const posGroups: Record<string, { players: PlayerEntry[]; ages: number[] }> = {
        QB: { players: [], ages: [] },
        RB: { players: [], ages: [] },
        WR: { players: [], ages: [] },
        TE: { players: [], ages: [] },
      };

      let starterValue = 0;

      for (const pid of playerIds) {
        const info = playerInfoMap.get(pid);
        if (!info || !info.position) continue;
        const pos = info.position;
        if (!posGroups[pos]) continue; // skip K, DEF, etc.

        const value = playerValueMap.get(pid) ?? 0;
        const isStarter = starterIds.has(pid);

        posGroups[pos].players.push({
          name: info.full_name,
          value,
          is_starter: isStarter,
          sleeper_id: pid,
        });

        if (info.age) posGroups[pos].ages.push(info.age);
        if (isStarter) starterValue += value;
      }

      // Sort players by value desc within each group
      for (const g of Object.values(posGroups)) {
        g.players.sort((a, b) => b.value - a.value);
      }

      // Draft picks for this roster
      const ownedPicks = picksByRosterId[roster.roster_id] || [];
      const draftPicks: PickEntry[] = [];
      let draftValue = 0;

      for (const pick of ownedPicks) {
        const value = lookupPickValue(
          pickValueMap,
          pick.season,
          pick.round,
          pick.slot,
          totalTeams
        );
        draftPicks.push({
          label: pick.label,
          value,
          via: pick.is_traded ? pick.original_owner_name : null,
        });
        draftValue += value;
      }

      draftPicks.sort((a, b) => b.value - a.value);

      // Overall value = sum of all position groups + draft
      let overallValue = draftValue;
      for (const g of Object.values(posGroups)) {
        for (const p of g.players) overallValue += p.value;
      }

      // Average age across all rostered players with known age
      const allAges: number[] = [];
      for (const g of Object.values(posGroups)) {
        allAges.push(...g.ages);
      }
      const avgAge =
        allAges.length > 0
          ? Math.round((allAges.reduce((s, a) => s + a, 0) / allAges.length) * 10) / 10
          : 0;

      teamBuilds.push({
        roster_id: roster.roster_id,
        owner_name: roster.display_name || "Unknown",
        avatar: roster.avatar,
        starters: starterIds,
        posGroups,
        draftPicks,
        draftValue,
        overallValue,
        starterValue,
        avgAge,
      });
    }

    // ── League-wide rankings ───────────────────────────────────

    const overallRanks = assignRanks(teamBuilds, (t) => t.overallValue);
    const starterRanks = assignRanks(teamBuilds, (t) => t.starterValue);
    const qbRanks = assignRanks(teamBuilds, (t) =>
      t.posGroups.QB.players.reduce((s, p) => s + p.value, 0)
    );
    const rbRanks = assignRanks(teamBuilds, (t) =>
      t.posGroups.RB.players.reduce((s, p) => s + p.value, 0)
    );
    const wrRanks = assignRanks(teamBuilds, (t) =>
      t.posGroups.WR.players.reduce((s, p) => s + p.value, 0)
    );
    const teRanks = assignRanks(teamBuilds, (t) =>
      t.posGroups.TE.players.reduce((s, p) => s + p.value, 0)
    );
    const draftRanks = assignRanks(teamBuilds, (t) => t.draftValue);

    // Roster-only ranks and averages (players only, no draft capital)
    const rosterRanks = assignRanks(teamBuilds, (t) => t.overallValue - t.draftValue);

    // League averages for team needs
    const leagueAvg: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const t of teamBuilds) {
      for (const pos of ["QB", "RB", "WR", "TE"]) {
        leagueAvg[pos] += t.posGroups[pos].players.reduce((s, p) => s + p.value, 0);
      }
    }
    for (const pos of Object.keys(leagueAvg)) {
      leagueAvg[pos] = teamBuilds.length > 0 ? leagueAvg[pos] / teamBuilds.length : 0;
    }

    // ── Build response ─────────────────────────────────────────

    const leagueAvgRosterValue = teamBuilds.length > 0
      ? teamBuilds.reduce((s, t) => s + (t.overallValue - t.draftValue), 0) / teamBuilds.length
      : 0;

    const teams: TeamRanking[] = teamBuilds.map((t) => {
      const oRank = overallRanks.get(t)!;
      const sRank = starterRanks.get(t)!;
      const rosterValue = t.overallValue - t.draftValue;
      const tier = getContenderTier({
        rosterValue,
        draftValue: t.draftValue,
        avgAge: t.avgAge,
        rosterRank: rosterRanks.get(t)!,
        totalTeams,
        leagueAvgRosterValue,
      });

      const positionValues: Record<string, number> = {};
      for (const pos of ["QB", "RB", "WR", "TE"]) {
        positionValues[pos] = t.posGroups[pos].players.reduce((s, p) => s + p.value, 0);
      }

      const avgAgeForGroup = (ages: number[]) =>
        ages.length > 0
          ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10
          : 0;

      return {
        roster_id: t.roster_id,
        owner_name: t.owner_name,
        team_name: t.owner_name,
        avatar: t.avatar,
        contender_tier: tier.label,
        contender_color: tier.color,
        contender_bg_color: tier.bgColor,
        overall_rank: oRank,
        overall_value: t.overallValue,
        starter_rank: sRank,
        starter_value: t.starterValue,
        avg_age: t.avgAge,
        team_needs: computeTeamNeeds(positionValues, leagueAvg),
        positions: {
          QB: {
            rank: qbRanks.get(t)!,
            value: positionValues.QB,
            avg_age: avgAgeForGroup(t.posGroups.QB.ages),
            players: t.posGroups.QB.players,
          },
          RB: {
            rank: rbRanks.get(t)!,
            value: positionValues.RB,
            avg_age: avgAgeForGroup(t.posGroups.RB.ages),
            players: t.posGroups.RB.players,
          },
          WR: {
            rank: wrRanks.get(t)!,
            value: positionValues.WR,
            avg_age: avgAgeForGroup(t.posGroups.WR.ages),
            players: t.posGroups.WR.players,
          },
          TE: {
            rank: teRanks.get(t)!,
            value: positionValues.TE,
            avg_age: avgAgeForGroup(t.posGroups.TE.ages),
            players: t.posGroups.TE.players,
          },
          DRAFT: {
            rank: draftRanks.get(t)!,
            value: t.draftValue,
            picks: t.draftPicks,
          },
        },
      };
    });

    // Sort by overall rank ascending for default order
    teams.sort((a, b) => a.overall_rank - b.overall_rank);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Power rankings error:", error);
    return NextResponse.json(
      { error: "Failed to compute power rankings" },
      { status: 500 }
    );
  }
}
