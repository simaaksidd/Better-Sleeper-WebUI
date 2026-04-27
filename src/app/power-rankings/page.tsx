"use client";

import { useState } from "react";
import { usePowerRankings } from "@/hooks/usePowerRankings";
import PowerRankingsChart from "@/components/power-rankings/PowerRankingsChart";
import TeamAnalysisTable from "@/components/power-rankings/TeamAnalysisTable";
import TierListMaker from "@/components/power-rankings/TierListMaker";
import PlayerModal from "@/components/PlayerModal";
import type { PlayerOnRoster } from "@/lib/types";

export default function PowerRankingsPage() {
  const { data, loading } = usePowerRankings();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(null);

  function handlePlayerClick(sleeperId: string, name: string) {
    // Fetch full player info for the modal
    fetch(`/api/players/${sleeperId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) {
          setSelectedPlayer({
            player_id: p.player_id,
            full_name: p.full_name,
            first_name: p.first_name,
            last_name: p.last_name,
            position: p.position || "",
            team: p.team ?? null,
            injury_status: p.injury_status ?? null,
            years_exp: p.years_exp ?? 0,
            age: p.age ?? null,
          });
        }
      })
      .catch(() => {});
  }

  if (loading) return <Skeleton />;

  if (!data || data.teams.length === 0) {
    return (
      <div className="text-center py-20 text-text-muted">
        No power rankings data available. Sync your league first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          Power Rankings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Dynasty value breakdown by team and position
        </p>
      </div>

      <PowerRankingsChart teams={data.teams} />
      <TeamAnalysisTable teams={data.teams} onPlayerClick={handlePlayerClick} />
      <TierListMaker teams={data.teams} />

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 w-48 bg-bg-card rounded animate-pulse" />
        <div className="h-4 w-72 bg-bg-card rounded animate-pulse mt-2" />
      </div>
      <div className="h-96 bg-bg-card rounded-xl animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
