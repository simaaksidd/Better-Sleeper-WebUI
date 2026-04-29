// Shared draft-pick value lookup. KTC publishes picks by tier (Early/Mid/Late)
// per round per season — names like "2026 Mid 1st", "2027 Late 2nd". Maps a
// (season, round, slot) tuple to one of those keys.

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

function tierForSlot(slot: number, totalTeams: number): "Early" | "Mid" | "Late" {
  const third = totalTeams / 3;
  if (slot <= third) return "Early";
  if (slot <= third * 2) return "Mid";
  return "Late";
}

export function lookupPickValue(
  pickValues: Map<string, number>,
  season: string,
  round: number,
  slot: number | null,
  totalTeams: number
): number {
  const ordinal = ORDINALS[round] || `${round}th`;

  if (slot !== null && totalTeams > 0) {
    const tier = tierForSlot(slot, totalTeams);
    const key = `${season} ${tier} ${ordinal}`;
    const val = pickValues.get(key);
    if (val !== undefined) return val;
  }

  // Slot unknown (future seasons) — fall back to mid-tier estimate.
  const midKey = `${season} Mid ${ordinal}`;
  const midVal = pickValues.get(midKey);
  if (midVal !== undefined) return midVal;

  return 0;
}
