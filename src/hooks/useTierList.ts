"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLeagueContext } from "@/context/LeagueContext";
import {
  clearTierList,
  defaultState,
  loadTierList,
  newTierId,
  NEW_TIER_COLOR,
  saveTierList,
  type Tier,
  type TierListState,
} from "@/lib/tierlist";

export interface UseTierListResult {
  state: TierListState;
  hydrated: boolean;
  addTier: () => void;
  deleteTier: (tierId: string) => void;
  moveTier: (tierId: string, direction: "up" | "down") => void;
  renameTier: (tierId: string, label: string) => void;
  recolorTier: (tierId: string, color: string) => void;
  placeTeam: (rosterId: number, tierId: string | null, index?: number) => void;
  reset: () => void;
}

export function useTierList(rosterIds: number[]): UseTierListResult {
  const { leagueId, hydrated: leagueHydrated } = useLeagueContext();
  const [state, setState] = useState<TierListState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);
  const lastLeagueRef = useRef<string | null>(null);

  // Hydrate from localStorage when leagueId becomes known (or changes).
  useEffect(() => {
    if (!leagueHydrated || !leagueId) return;
    if (lastLeagueRef.current === leagueId) return;
    lastLeagueRef.current = leagueId;
    const stored = loadTierList(leagueId);
    setState(stored ?? defaultState());
    setHydrated(true);
  }, [leagueHydrated, leagueId]);

  // Persist on change.
  useEffect(() => {
    if (!hydrated || !leagueId) return;
    saveTierList(leagueId, state);
  }, [state, hydrated, leagueId]);

  // Prune roster IDs that no longer exist in the current league teams.
  useEffect(() => {
    if (!hydrated) return;
    const valid = new Set(rosterIds);
    setState((prev) => {
      let changed = false;
      const tiers = prev.tiers.map((t) => {
        const filtered = t.rosterIds.filter((id) => valid.has(id));
        if (filtered.length !== t.rosterIds.length) changed = true;
        return changed ? { ...t, rosterIds: filtered } : t;
      });
      return changed ? { tiers } : prev;
    });
  }, [rosterIds, hydrated]);

  const addTier = useCallback(() => {
    setState((prev) => ({
      tiers: [
        ...prev.tiers,
        {
          id: newTierId(),
          label: "New",
          color: NEW_TIER_COLOR,
          rosterIds: [],
        },
      ],
    }));
  }, []);

  const deleteTier = useCallback((tierId: string) => {
    setState((prev) => ({
      tiers: prev.tiers.filter((t) => t.id !== tierId),
    }));
  }, []);

  const moveTier = useCallback((tierId: string, direction: "up" | "down") => {
    setState((prev) => {
      const idx = prev.tiers.findIndex((t) => t.id === tierId);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.tiers.length) return prev;
      const next = prev.tiers.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return { tiers: next };
    });
  }, []);

  const renameTier = useCallback((tierId: string, label: string) => {
    setState((prev) => ({
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, label } : t,
      ),
    }));
  }, []);

  const recolorTier = useCallback((tierId: string, color: string) => {
    setState((prev) => ({
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, color } : t,
      ),
    }));
  }, []);

  const placeTeam = useCallback(
    (rosterId: number, tierId: string | null, index?: number) => {
      setState((prev) => {
        const stripped: Tier[] = prev.tiers.map((t) => ({
          ...t,
          rosterIds: t.rosterIds.filter((id) => id !== rosterId),
        }));
        if (tierId === null) return { tiers: stripped };
        const targetIdx = stripped.findIndex((t) => t.id === tierId);
        if (targetIdx === -1) return { tiers: stripped };
        const target = stripped[targetIdx];
        const insertAt =
          typeof index === "number" && index >= 0 && index <= target.rosterIds.length
            ? index
            : target.rosterIds.length;
        const nextIds = target.rosterIds.slice();
        nextIds.splice(insertAt, 0, rosterId);
        stripped[targetIdx] = { ...target, rosterIds: nextIds };
        return { tiers: stripped };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (leagueId) clearTierList(leagueId);
    setState(defaultState());
  }, [leagueId]);

  return {
    state,
    hydrated,
    addTier,
    deleteTier,
    moveTier,
    renameTier,
    recolorTier,
    placeTeam,
    reset,
  };
}
