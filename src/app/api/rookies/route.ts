import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface FantasyCalcPlayer {
  value: number;
  overallRank: number;
  positionRank: number;
  trend30Day: number;
  player: {
    name: string;
    position: string;
    maybeTeam: string | null;
    maybeCollege: string | null;
    maybeYoe: number | null;
    sleeperId: string | null;
    maybeAge: number | null;
  };
}

export async function GET() {
  const db = getDb();

  // Determine league format for FantasyCalc query
  const league = db
    .prepare("SELECT scoring_settings, total_rosters FROM league LIMIT 1")
    .get() as { scoring_settings: string; total_rosters: number } | undefined;

  let numQbs = 1;
  let ppr = 1;
  let numTeams = 12;

  if (league) {
    const scoring = JSON.parse(league.scoring_settings);
    ppr = scoring.rec ?? 1;
    numTeams = league.total_rosters || 12;

    // Check roster positions for superflex/2QB
    const leagueFull = db
      .prepare("SELECT roster_positions FROM league LIMIT 1")
      .get() as { roster_positions: string } | undefined;
    if (leagueFull) {
      const positions: string[] = JSON.parse(leagueFull.roster_positions);
      const qbSlots = positions.filter(
        (p) => p === "QB" || p === "SUPER_FLEX"
      ).length;
      if (qbSlots >= 2) numQbs = 2;
    }
  }

  try {
    const res = await fetch(
      `https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=${numQbs}&numTeams=${numTeams}&ppr=${ppr}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch rookie rankings" },
        { status: 502 }
      );
    }

    const allPlayers: FantasyCalcPlayer[] = await res.json();

    // Filter to rookies only (not yet in the NFL / years of experience <= 0)
    const rookies = allPlayers
      .filter(
        (p) =>
          p.player.maybeYoe !== null &&
          p.player.maybeYoe <= 0 &&
          p.player.maybeTeam === null
      )
      .map((p, i) => ({
        rank: i + 1,
        name: p.player.name,
        position: p.player.position,
        sleeper_id: p.player.sleeperId,
        value: p.value,
        overall_rank: p.overallRank,
        position_rank: p.positionRank,
        trend: p.trend30Day,
        age: p.player.maybeAge,
      }));

    return NextResponse.json({
      rookies,
      format: { numQbs, numTeams, ppr },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rookie rankings" },
      { status: 502 }
    );
  }
}
