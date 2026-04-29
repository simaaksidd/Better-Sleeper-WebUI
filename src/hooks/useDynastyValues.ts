"use client";

import { useState, useEffect } from "react";

export { lookupPickValue as getPickValue } from "@/lib/pick-values";

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
