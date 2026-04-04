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
  league: LeagueInfo | null;
  nflState: NflState | null;
  myRosterId: number | null;
  setMyRosterId: (id: number) => void;
  loading: boolean;
  syncing: boolean;
  syncProgress: number;
  triggerSync: () => Promise<void>;
}

const LeagueCtx = createContext<LeagueContextValue>({
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
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [nflState, setNflState] = useState<NflState | null>(null);
  const [myRosterId, _setMyRosterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/sync");
        const data = await res.json();
        setSyncProgress((prev) => Math.max(prev, data.progress ?? 0));

        if (!data.syncing) {
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

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncProgress(0);
    fetch("/api/sync", { method: "POST" }).catch(console.error);
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("myRosterId");
    if (stored) _setMyRosterId(parseInt(stored));
    fetchLeague();
  }, [fetchLeague]);

  return (
    <LeagueCtx.Provider
      value={{
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
