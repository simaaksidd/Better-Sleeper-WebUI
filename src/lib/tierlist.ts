export interface Tier {
  id: string;
  label: string;
  color: string;
  rosterIds: number[];
}

export interface TierListState {
  tiers: Tier[];
}

export const DEFAULT_TIERS: Tier[] = [
  { id: "tier-s", label: "S", color: "#ef4444", rosterIds: [] },
  { id: "tier-a", label: "A", color: "#f97316", rosterIds: [] },
  { id: "tier-b", label: "B", color: "#eab308", rosterIds: [] },
  { id: "tier-c", label: "C", color: "#22c55e", rosterIds: [] },
  { id: "tier-d", label: "D", color: "#a855f7", rosterIds: [] },
];

export const NEW_TIER_COLOR = "#64748b";

export const POOL_ID = "pool";

export function defaultState(): TierListState {
  return { tiers: DEFAULT_TIERS.map((t) => ({ ...t, rosterIds: [] })) };
}

export function storageKey(leagueId: string): string {
  return `tierlist:${leagueId}`;
}

export function loadTierList(leagueId: string): TierListState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(leagueId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TierListState;
    if (!parsed?.tiers || !Array.isArray(parsed.tiers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTierList(leagueId: string, state: TierListState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(leagueId), JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearTierList(leagueId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(leagueId));
  } catch {
    // ignore
  }
}

export function newTierId(): string {
  return `tier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
