import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { collegeHeadshotUrl } from "@/lib/espn-college";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Get player bio from Sleeper data
  const player = db
    .prepare("SELECT * FROM players WHERE player_id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Get ESPN college ID — fall back to player's espn_id from Sleeper data
  // since ESPN IDs work across NFL and college-football endpoints
  const idMap = db
    .prepare("SELECT espn_college_id FROM player_id_map WHERE sleeper_id = ?")
    .get(id) as { espn_college_id: string | null } | undefined;

  let espnCollegeId = idMap?.espn_college_id || null;
  if (!espnCollegeId && player.espn_id) {
    espnCollegeId = String(player.espn_id);
  }

  // Get combine results (match by name + college)
  const combine = db
    .prepare(
      `SELECT * FROM combine_results
       WHERE player_name = ? AND (school = ? OR school IS NULL)
       ORDER BY draft_year DESC LIMIT 1`
    )
    .get(player.full_name, player.college) as Record<string, unknown> | undefined;

  // Also try by sleeper_id if stored
  const combineById = combine || (db
    .prepare("SELECT * FROM combine_results WHERE sleeper_id = ? LIMIT 1")
    .get(id) as Record<string, unknown> | undefined);

  // Get college season stats
  const collegeSeasons = espnCollegeId
    ? (db
        .prepare(
          "SELECT * FROM college_stats_season WHERE espn_college_id = ? ORDER BY season DESC"
        )
        .all(espnCollegeId) as Array<Record<string, unknown>>)
    : [];

  // Get draft info from drafts table
  const draftPick = db
    .prepare(
      `SELECT d.round, d.pick_no, d.draft_id, d.metadata
       FROM drafts d WHERE d.player_id = ? LIMIT 1`
    )
    .get(id) as Record<string, unknown> | undefined;

  const combineData = combineById
    ? {
        forty: combineById.forty,
        vertical: combineById.vertical,
        bench: combineById.bench,
        broad_jump: combineById.broad_jump,
        cone: combineById.cone,
        shuttle: combineById.shuttle,
        draft_team: combineById.draft_team,
        draft_round: combineById.draft_round,
        draft_ovr: combineById.draft_ovr,
      }
    : null;

  return NextResponse.json({
    player_id: id,
    first_name: player.first_name,
    last_name: player.last_name,
    full_name: player.full_name,
    position: player.position,
    team: player.team,
    age: player.age,
    height: player.height,
    weight: player.weight,
    college: player.college,
    years_exp: player.years_exp,
    espn_college_id: espnCollegeId,
    headshot_url: espnCollegeId ? collegeHeadshotUrl(espnCollegeId) : null,
    combine: combineData,
    college_seasons: collegeSeasons.map((s) => ({
      season: s.season,
      games_played: s.games_played,
      completions: s.completions,
      attempts: s.attempts,
      passing_yards: s.passing_yards,
      passing_tds: s.passing_tds,
      interceptions: s.interceptions,
      carries: s.carries,
      rushing_yards: s.rushing_yards,
      rushing_tds: s.rushing_tds,
      receptions: s.receptions,
      receiving_yards: s.receiving_yards,
      receiving_tds: s.receiving_tds,
      fumbles_lost: s.fumbles_lost,
      sacks: s.sacks,
      tackles_total: s.tackles_total,
      tackles_for_loss: s.tackles_for_loss,
      pass_defended: s.pass_defended,
      def_interceptions: s.def_interceptions,
    })),
    draft: draftPick
      ? {
          round: draftPick.round,
          pick_no: draftPick.pick_no,
        }
      : combineData?.draft_round
        ? {
            round: combineData.draft_round,
            pick_no: combineData.draft_ovr,
            team: combineData.draft_team,
          }
        : null,
  });
}
