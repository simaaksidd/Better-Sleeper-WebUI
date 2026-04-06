"use client";

import { useLeagueContext } from "@/context/LeagueContext";

export default function SyncButton() {
  const { syncing, triggerSync } = useLeagueContext();

  return (
    <button
      onClick={() => triggerSync()}
      disabled={syncing}
      className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50"
    >
      {syncing ? "Syncing..." : "Sync Data"}
    </button>
  );
}
