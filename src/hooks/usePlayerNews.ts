"use client";

import { useState, useEffect } from "react";

export interface NewsItem {
  headline: string;
  description: string;
  published: string;
  story: string | null;
  url: string | null;
  image: string | null;
}

export function usePlayerNews(playerId: string | null) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`/api/players/${playerId}/news`)
      .then((r) => (r.ok ? r.json() : { news: [] }))
      .then((data) => setNews(data.news || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [playerId]);

  return { news, loading };
}
