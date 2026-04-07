"use client";

import { useState, useEffect } from "react";

interface DynastyValuesResult {
  values: Map<string, number>;
  pickValues: Map<string, number>;
  scrapeDate: string | null;
  loading: boolean;
}

export function useDynastyValues(): DynastyValuesResult {
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [pickValues, setPickValues] = useState<Map<string, number>>(new Map());
  const [scrapeDate, setScrapeDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/values")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const playerMap = new Map<string, number>();
          for (const [id, info] of Object.entries(data.players)) {
            playerMap.set(id, (info as { value: number }).value);
          }
          setValues(playerMap);

          const pickMap = new Map<string, number>();
          for (const p of data.picks as Array<{ name: string; value: number }>) {
            pickMap.set(p.name, p.value);
          }
          setPickValues(pickMap);

          setScrapeDate(data.scrape_date ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { values, pickValues, scrapeDate, loading };
}

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

/**
 * Look up a draft pick's dynasty value from the pickValues map.
 * Tries multiple key formats since DynastyProcess labels vary
 * (e.g., "2026 Mid 1st", "2026 1st", "2027 Late 2nd").
 */
export function getPickValue(
  pickValues: Map<string, number>,
  season: string,
  round: number,
  pickSlot: number | null,
  totalTeams: number
): number {
  const ordinal = ORDINALS[round] || `${round}th`;

  // Determine Early/Mid/Late from pick slot
  if (pickSlot && totalTeams > 0) {
    const third = totalTeams / 3;
    const tier = pickSlot <= third ? "Early" : pickSlot <= third * 2 ? "Mid" : "Late";
    const key = `${season} ${tier} ${ordinal}`;
    const val = pickValues.get(key);
    if (val !== undefined) return val;
  }

  // Fallback: try "Mid" default
  const midKey = `${season} Mid ${ordinal}`;
  const midVal = pickValues.get(midKey);
  if (midVal !== undefined) return midVal;

  // Fallback: try without tier (e.g., "2027 1st" for future picks)
  const plainKey = `${season} ${ordinal}`;
  const plainVal = pickValues.get(plainKey);
  if (plainVal !== undefined) return plainVal;

  return 0;
}
