"use client";

import { useState, useEffect } from "react";

export interface DepthChartPlayer {
  player_id: string;
  full_name: string;
  position: string;
}

// Maps position group (e.g. "QB", "WR1") to ordered array of players
export type DepthChartData = Record<string, DepthChartPlayer[]>;

export function useDepthChart(team: string | null) {
  const [depthChart, setDepthChart] = useState<DepthChartData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!team) return;
    setLoading(true);
    fetch(`/api/depth-chart/${team}`)
      .then((r) => (r.ok ? r.json() : { depth_chart: {} }))
      .then((data) => setDepthChart(data.depth_chart || {}))
      .catch(() => setDepthChart({}))
      .finally(() => setLoading(false));
  }, [team]);

  return { depthChart, loading };
}
