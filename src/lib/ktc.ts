// KeepTradeCut dynasty rankings scraper.
//
// KTC has no public API. Their HTML page inlines the full ranking set as a
// `playersArray = [...]` JS literal in a script tag — one fetch returns the
// full ~500-row dataset including 1QB and Superflex values plus TE Premium
// variants (TE+, TE++, TE+++). We regex-extract the literal and JSON.parse it.

const KTC_URL =
  "https://keeptradecut.com/dynasty-rankings?page=0&filters=QB|WR|RB|TE|RDP&format=1";

// KTC uses some 3-letter team codes that differ from Sleeper's 2- or 3-letter
// codes. Normalize to Sleeper's so name+team matching works.
const KTC_TO_SLEEPER_TEAM: Record<string, string> = {
  KCC: "KC",
  GBP: "GB",
  JAC: "JAX",
  LAR: "LAR",
  LVR: "LV",
  NEP: "NE",
  NOS: "NO",
  SFO: "SF",
  TBB: "TB",
  WAS: "WAS",
};

interface KtcValueBlock {
  value: number;
  tep?: { value: number };
  tepp?: { value: number };
  teppp?: { value: number };
}

interface KtcRawRow {
  playerName: string;
  position: string; // "QB" | "RB" | "WR" | "TE" | "RDP"
  team: string | null;
  age: number | null;
  oneQBValues?: KtcValueBlock;
  superflexValues?: KtcValueBlock;
}

export interface KtcRow {
  player: string;
  pos: string | null; // null for picks
  team: string | null; // null for picks
  age: number | null;
  is_pick: boolean;
  value_1qb: number;
  value_1qb_tep: number;
  value_1qb_tepp: number;
  value_sf: number;
  value_sf_tep: number;
  value_sf_tepp: number;
}

export async function fetchKtcRankings(): Promise<KtcRow[] | null> {
  const res = await fetch(KTC_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) {
    console.error(`KTC fetch failed: ${res.status}`);
    return null;
  }
  const html = await res.text();

  const match = html.match(/playersArray\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    console.error("KTC: playersArray literal not found in HTML");
    return null;
  }

  let raw: KtcRawRow[];
  try {
    raw = JSON.parse(match[1]);
  } catch (e) {
    console.error("KTC: failed to parse playersArray JSON:", e);
    return null;
  }

  return raw.map((r) => {
    const isPick = r.position === "RDP";
    const oneQB = r.oneQBValues;
    const sf = r.superflexValues;
    const rawTeam = r.team;
    const team =
      isPick || !rawTeam || rawTeam === "FA"
        ? null
        : (KTC_TO_SLEEPER_TEAM[rawTeam] ?? rawTeam);
    return {
      player: r.playerName,
      pos: isPick ? null : r.position,
      team,
      age: isPick ? null : r.age,
      is_pick: isPick,
      value_1qb: oneQB?.value ?? 0,
      value_1qb_tep: oneQB?.tep?.value ?? oneQB?.value ?? 0,
      value_1qb_tepp: oneQB?.tepp?.value ?? oneQB?.value ?? 0,
      value_sf: sf?.value ?? 0,
      value_sf_tep: sf?.tep?.value ?? sf?.value ?? 0,
      value_sf_tepp: sf?.tepp?.value ?? sf?.value ?? 0,
    };
  });
}
