"use client";

import { useRosters } from "@/hooks/useRosters";
import { useLeagueContext } from "@/context/LeagueContext";
import PlayerModal from "@/components/PlayerModal";
import TeamColumn from "@/components/TeamColumn";
import type { DraftPick } from "@/components/TeamColumn";
import { useState, useEffect, useMemo } from "react";
import type { PlayerOnRoster } from "@/lib/types";

export default function AllTeamsPage() {
  const { loading: leagueLoading, league } = useLeagueContext();
  const { rosters, loading: rostersLoading } = useRosters();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(
    null
  );
  const [picksByOwner, setPicksByOwner] = useState<Record<number, DraftPick[]>>({});
  const [pickSeasons, setPickSeasons] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/draft-picks")
      .then((r) => (r.ok ? r.json() : { picks_by_owner: {}, seasons: [] }))
      .then((data) => {
        setPicksByOwner(data.picks_by_owner || {});
        setPickSeasons(data.seasons || []);
      })
      .catch(() => {});
  }, []);

  const { starterCount, benchCount, reserveCount } = useMemo(() => {
    const positions = league?.roster_positions || [];
    const sc = positions.filter((p) => p !== "BN").length;
    const bc = positions.filter((p) => p === "BN").length;
    const rc = rosters.reduce(
      (max, r) => Math.max(max, (r.reserve || []).length),
      0
    );
    return { starterCount: sc, benchCount: bc, reserveCount: rc };
  }, [league, rosters]);

  const loading = leagueLoading || rostersLoading;

  if (loading) {
    return (
      <div className="fixed inset-0 top-14 overflow-auto bg-bg-primary z-0">
        <div className="px-8 py-8">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-96 flex-1 bg-bg-card rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-14 overflow-auto bg-bg-primary z-0">
      <div className="px-8 py-8">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rosters.length}, minmax(0, 1fr))` }}>
          {rosters.map((r) => (
            <TeamColumn
              key={r.roster_id}
              roster={r}
              onPlayerClick={setSelectedPlayer}
              picks={picksByOwner[r.roster_id] || []}
              seasons={pickSeasons}
              starterCount={starterCount}
              benchCount={benchCount}
              reserveCount={reserveCount}
            />
          ))}
        </div>
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
