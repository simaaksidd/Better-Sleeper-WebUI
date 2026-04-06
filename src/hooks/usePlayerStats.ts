"use client";

import { useState, useEffect } from "react";

export interface StatRow {
  week: number;
  opponent_team: string | null;
  completions: number;
  attempts: number;
  passing_yards: number;
  passing_tds: number;
  passing_interceptions: number;
  sacks_suffered: number;
  sack_yards_lost: number;
  carries: number;
  rushing_yards: number;
  rushing_tds: number;
  targets: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  rushing_fumbles: number;
  rushing_fumbles_lost: number;
  receiving_fumbles: number;
  receiving_fumbles_lost: number;
  sack_fumbles: number;
  sack_fumbles_lost: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fg_made: number;
  fg_att: number;
  pat_made: number;
  pat_att: number;
  pos_rank: number | null;
  ovr_rank: number | null;
}

export function usePlayerStats(playerId: string | null, season: number) {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`/api/players/${playerId}/stats?season=${season}`)
      .then((r) => (r.ok ? r.json() : { stats: [], source: "empty" }))
      .then((data) => {
        setStats(data.stats || []);
        setSource(data.source || "empty");
      })
      .catch(() => {
        setStats([]);
        setSource("error");
      })
      .finally(() => setLoading(false));
  }, [playerId, season]);

  return { stats, source, loading };
}
