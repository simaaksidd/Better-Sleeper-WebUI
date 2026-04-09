"use client";

import { useState, useEffect } from "react";
import type { PowerRankingsData } from "@/lib/types";

export function usePowerRankings() {
  const [data, setData] = useState<PowerRankingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/power-rankings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d as PowerRankingsData | null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
