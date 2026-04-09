// ── Contender Tier ──────────────────────────────────────────────

export interface ContenderTier {
  label: string;
  color: string;
  bgColor: string;
}

const TIER_DYNASTY: ContenderTier = { label: "Dynasty", color: "#16a34a", bgColor: "#16a34a22" };
const TIER_CONTENDER: ContenderTier = { label: "Contender", color: "#22c55e", bgColor: "#22c55e22" };
const TIER_MID: ContenderTier = { label: "Mid", color: "#ca8a04", bgColor: "#ca8a0422" };
const TIER_REBUILD: ContenderTier = { label: "Rebuild", color: "#7c3aed", bgColor: "#7c3aed22" };
const TIER_FRAUD: ContenderTier = { label: "Fraud", color: "#dc2626", bgColor: "#dc262622" };

export interface TierInput {
  rosterValue: number;       // player-only value (no picks)
  draftValue: number;        // draft pick value
  avgAge: number;
  rosterRank: number;        // rank by roster value (players only)
  totalTeams: number;
  leagueAvgRosterValue: number;
}

export function getContenderTier(input: TierInput): ContenderTier {
  const {
    rosterValue, draftValue, avgAge,
    rosterRank, totalTeams, leagueAvgRosterValue,
  } = input;

  const totalValue = rosterValue + draftValue;
  const draftPct = totalValue > 0 ? draftValue / totalValue : 0;

  // ── Roster strength (players only) ──
  const topCutoff = Math.ceil(totalTeams * 0.3);
  const strongRoster = rosterRank <= topCutoff;
  const weakRoster = rosterValue < leagueAvgRosterValue * 0.9;

  // ── Age ──
  const isYoung = avgAge < 25.5;
  const isOld = avgAge >= 26.5;

  // ── Draft investment ──
  const heavyDraft = draftPct >= 0.3;

  // Dynasty: strong roster AND young — set up for years
  if (strongRoster && isYoung) return TIER_DYNASTY;

  // Contender: strong roster, any age — win-now window
  if (strongRoster) return TIER_CONTENDER;

  // Rebuild: 30%+ of total value in draft picks — intentionally tearing down
  if (heavyDraft) return TIER_REBUILD;

  // Fraud: weak roster, older, no draft capital to show for it
  if (weakRoster && isOld && !heavyDraft) return TIER_FRAUD;

  // Fraud: weak roster, not young, light on picks — no clear path forward
  if (weakRoster && !isYoung && !heavyDraft) return TIER_FRAUD;

  // Mid: average roster, nothing stands out
  return TIER_MID;
}

// ── Rank Badge Color ───────────────────────────────────────────

export function getRankBadgeColor(rank: number): string {
  if (rank <= 3) return "#16a34a";
  if (rank <= 7) return "#ca8a04";
  return "#dc2626";
}

// ── Team Needs ─────────────────────────────────────────────────

export function computeTeamNeeds(
  teamValues: Record<string, number>,
  leagueAvgValues: Record<string, number>
): string[] {
  const needs: string[] = [];
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const teamVal = teamValues[pos] ?? 0;
    const avgVal = leagueAvgValues[pos] ?? 0;
    if (avgVal > 0 && teamVal < avgVal * 0.75) {
      needs.push(pos);
    }
  }
  return needs;
}

// ── Rank Assignment ────────────────────────────────────────────

export function assignRanks<T>(
  items: T[],
  getValue: (item: T) => number
): Map<T, number> {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  const ranks = new Map<T, number>();
  sorted.forEach((item, i) => ranks.set(item, i + 1));
  return ranks;
}

// ── Pick Value Lookup ──────────────────────────────────────────

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

export function lookupPickValue(
  pickValuesMap: Map<string, number>,
  season: string,
  round: number,
  slot: number | null,
  totalTeams: number
): number {
  const ordinal = ORDINALS[round] || `${round}th`;

  // Strategy 1: exact slot match for current-year picks (e.g. "2026 Pick 2.09")
  if (slot !== null) {
    const exactKey = `${season} Pick ${round}.${String(slot).padStart(2, "0")}`;
    const exactVal = pickValuesMap.get(exactKey);
    if (exactVal !== undefined) return exactVal;
  }

  // Strategy 2: Early/Mid/Late tier match
  if (slot !== null && totalTeams > 0) {
    const third = totalTeams / 3;
    const tier = slot <= third ? "Early" : slot <= third * 2 ? "Mid" : "Late";
    const tierKey = `${season} ${tier} ${ordinal}`;
    const tierVal = pickValuesMap.get(tierKey);
    if (tierVal !== undefined) return tierVal;
  }

  // Strategy 3: fallback to Mid
  const midKey = `${season} Mid ${ordinal}`;
  const midVal = pickValuesMap.get(midKey);
  if (midVal !== undefined) return midVal;

  // Strategy 4: fallback to plain (e.g. "2027 1st")
  const plainKey = `${season} ${ordinal}`;
  const plainVal = pickValuesMap.get(plainKey);
  if (plainVal !== undefined) return plainVal;

  return 0;
}
