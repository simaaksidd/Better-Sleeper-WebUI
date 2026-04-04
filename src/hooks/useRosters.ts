"use client";

import { useState, useEffect } from "react";
import type { RosterWithUser } from "@/lib/types";

export function useRosters() {
  const [rosters, setRosters] = useState<RosterWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rosters")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRosters)
      .catch(() => setRosters([]))
      .finally(() => setLoading(false));
  }, []);

  return { rosters, loading, refetch: () => {
    setLoading(true);
    fetch("/api/rosters")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRosters)
      .catch(() => setRosters([]))
      .finally(() => setLoading(false));
  }};
}
