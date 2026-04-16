"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { LeagueInfo, NflState } from "@/lib/types";

interface LeagueContextValue {
  leagueId: string | null;
  setLeagueId: (id: string) => void;
  clearLeagueId: () => void;
  hydrated: boolean;
  league: LeagueInfo | null;
  nflState: NflState | null;
  myRosterId: number | null;
  setMyRosterId: (id: number) => void;
  loading: boolean;
  syncing: boolean;
  syncProgress: number;
  triggerSync: (overrideLeagueId?: string) => Promise<void>;
}

const LeagueCtx = createContext<LeagueContextValue>({
  leagueId: null,
  setLeagueId: () => {},
  clearLeagueId: () => {},
  hydrated: false,
  league: null,
  nflState: null,
  myRosterId: null,
  setMyRosterId: () => {},
  loading: true,
  syncing: false,
  syncProgress: 0,
  triggerSync: async () => {},
});

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [leagueId, _setLeagueId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [nflState, setNflState] = useState<NflState | null>(null);
  const [myRosterId, _setMyRosterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setLeagueId = useCallback((id: string) => {
    _setLeagueId(id);
    localStorage.setItem("leagueId", id);
  }, []);

  const clearLeagueId = useCallback(() => {
    _setLeagueId(null);
    localStorage.removeItem("leagueId");
    localStorage.removeItem("myRosterId");
    _setMyRosterId(null);
    setLeague(null);
    setNflState(null);
  }, []);

  const setMyRosterId = useCallback((id: number) => {
    _setMyRosterId(id);
    localStorage.setItem("myRosterId", String(id));
  }, []);

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch("/api/league");
      if (res.ok) {
        const data = await res.json();
        setLeague({
          league_id: data.league_id,
          name: data.name,
          season: data.season,
          total_rosters: data.total_rosters,
          roster_positions: data.roster_positions,
          scoring_settings: data.scoring_settings,
          scoring_type:
            data.scoring_settings?.rec === 1
              ? "PPR"
              : data.scoring_settings?.rec === 0.5
                ? "Half PPR"
                : "Standard",
        });
        if (data.nfl_state) setNflState(data.nfl_state);
      }
    } catch {
      // Will be empty until first sync
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    // Only treat "not syncing" as done after we've observed the sync actually
    // starting. Protects against racing the POST on slow networks / cold starts.
    let hasSeenSyncing = false;
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/sync");
        const data = await res.json();
        setSyncProgress((prev) => Math.max(prev, data.progress ?? 0));

        if (data.syncing) hasSeenSyncing = true;

        const waitedTooLong = Date.now() - startedAt > 20_000;
        if (!data.syncing && (hasSeenSyncing || waitedTooLong)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setSyncProgress(100);
          setTimeout(() => {
            window.location.reload();
          }, 400);
        }
      } catch {
        // Poll failed, keep trying
      }
    }, 500);
  }, [fetchLeague]);

  const triggerSync = useCallback(async (overrideLeagueId?: string) => {
    setSyncing(true);
    setSyncProgress(0);
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrideLeagueId ? { leagueId: overrideLeagueId } : {}),
    }).catch(console.error);
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const storedLeague = localStorage.getItem("leagueId");
    if (storedLeague) _setLeagueId(storedLeague);
    const storedRoster = localStorage.getItem("myRosterId");
    if (storedRoster) _setMyRosterId(parseInt(storedRoster));
    setHydrated(true);
  }, []);

  // Fetch league data once hydrated and leagueId is known
  useEffect(() => {
    if (!hydrated) return;
    if (leagueId) fetchLeague();
    else setLoading(false);
  }, [hydrated, leagueId, fetchLeague]);

  return (
    <LeagueCtx.Provider
      value={{
        leagueId,
        setLeagueId,
        clearLeagueId,
        hydrated,
        league,
        nflState,
        myRosterId,
        setMyRosterId,
        loading,
        syncing,
        syncProgress,
        triggerSync,
      }}
    >
      {children}
    </LeagueCtx.Provider>
  );
}

export function useLeagueContext() {
  return useContext(LeagueCtx);
}
