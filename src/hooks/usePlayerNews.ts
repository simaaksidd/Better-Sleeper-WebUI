"use client";

import { useState, useEffect } from "react";

export interface NewsItem {
  headline: string;
  description: string;
  published: string;
  story: string | null;
  url: string | null;
  image: string | null;
  source: string;
}

export function usePlayerNews(playerId: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`/api/players/${playerId}/news`)
      .then((r) => (r.ok ? r.json() : { news: [], sources: [] }))
      .then((data) => {
        setNews(data.news || []);
        setSources(data.sources || []);
      })
      .catch(() => {
        setNews([]);
        setSources([]);
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  return { news, sources, loading };
}
