"use client";

import { useLeagueContext } from "@/context/LeagueContext";
import { useRosters } from "@/hooks/useRosters";
import PlayerRow from "@/components/PlayerRow";
import TeamSelector from "@/components/TeamSelector";
import SyncButton from "@/components/SyncButton";
import PlayerModal from "@/components/PlayerModal";
import { useState, useEffect } from "react";
import type { RosterWithUser, PlayerOnRoster } from "@/lib/types";

interface DraftPick {
  season: string;
  round: number;
  pick_slot: number;
  pick_label: string;
  roster_id: number;
  owner_id: number;
  original_owner_name: string;
}

export default function MyTeamPage() {
  const { myRosterId, league, loading: leagueLoading } = useLeagueContext();
  const { rosters, loading: rostersLoading } = useRosters();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(
    null
  );
  const [myPicks, setMyPicks] = useState<DraftPick[]>([]);
  const [pickSeasons, setPickSeasons] = useState<string[]>([]);

  useEffect(() => {
    if (!myRosterId) return;
    fetch("/api/draft-picks")
      .then((r) => (r.ok ? r.json() : { picks_by_owner: {}, seasons: [] }))
      .then((data) => {
        setMyPicks(data.picks_by_owner?.[myRosterId] || []);
        setPickSeasons(data.seasons || []);
      })
      .catch(() => {});
  }, [myRosterId]);

  const loading = leagueLoading || rostersLoading;

  if (loading) {
    return <Skeleton />;
  }

  if (rosters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h1 className="text-2xl font-bold">Welcome to your League Dashboard</h1>
        <p className="text-text-secondary">
          Sync your league data to get started.
        </p>
        <SyncButton />
      </div>
    );
  }

  const myRoster: RosterWithUser | undefined = rosters.find(
    (r) => r.roster_id === myRosterId
  );

  if (!myRosterId || !myRoster) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h1 className="text-2xl font-bold">Select Your Team</h1>
        <p className="text-text-secondary">
          Choose your team to see your roster.
        </p>
        <TeamSelector />
      </div>
    );
  }

  const rosterPositions = league?.roster_positions || [];

  // Build starter slots
  const starterSlots = rosterPositions.filter((p) => p !== "BN");
  const starters = myRoster.starters.map((pid, i) => {
    const player = myRoster.players.find((p) => p.player_id === pid);
    return {
      slot: starterSlots[i] || "FLEX",
      player: player || null,
      playerId: pid,
    };
  });

  const benchPlayerIds = myRoster.players
    .filter((p) => !myRoster.starters.includes(p.player_id))
    .map((p) => p);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{myRoster.display_name}</h1>
          <p className="text-text-secondary text-sm">
            {myRoster.wins}-{myRoster.losses}
            {myRoster.ties > 0 ? `-${myRoster.ties}` : ""} | {myRoster.fpts.toFixed(2)} pts
          </p>
        </div>
        <TeamSelector />
      </div>

      {/* Starters */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
          Starters
        </h2>
        <div className="bg-bg-card rounded-xl border border-border divide-y divide-border">
          {starters.map((s, i) => (
            <div key={i}>
              {s.player ? (
                <PlayerRow
                  player_id={s.player.player_id}
                  full_name={s.player.full_name}
                  position={s.player.position}
                  team={s.player.team}
                  injury_status={s.player.injury_status}
                  isStarter
                  slotLabel={s.slot}
                  onClick={() => setSelectedPlayer(s.player)}
                />
              ) : (
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="text-xs font-medium text-text-muted w-12">
                    {s.slot}
                  </span>
                  <span className="text-text-muted text-sm italic">
                    Empty
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bench */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
          Bench
        </h2>
        <div className="bg-bg-card rounded-xl border border-border divide-y divide-border">
          {benchPlayerIds.map((p) => (
            <PlayerRow
              key={p.player_id}
              player_id={p.player_id}
              full_name={p.full_name}
              position={p.position}
              team={p.team}
              injury_status={p.injury_status}
              slotLabel="BN"
              onClick={() => setSelectedPlayer(p)}
            />
          ))}
        </div>
      </section>

      {/* Draft Picks */}
      {myPicks.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
            Draft Picks
          </h2>
          {pickSeasons.map((season) => {
            const seasonPicks = myPicks.filter((p) => p.season === season);
            if (seasonPicks.length === 0) return null;
            return (
              <div key={season} className="mb-4">
                <h3 className="text-xs font-medium text-text-secondary mb-2">
                  {season}
                </h3>
                <div className="bg-bg-card rounded-xl border border-border divide-y divide-border">
                  {seasonPicks.map((p) => (
                    <div
                      key={`${p.season}-${p.round}-${p.roster_id}`}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-sm w-12">
                          {p.pick_label}
                        </span>
                        <span className="text-sm text-text-secondary">
                          Round {p.round}
                        </span>
                      </div>
                      {p.roster_id !== p.owner_id && (
                        <span className="text-xs text-text-muted">
                          via {p.original_owner_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

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
    <div className="space-y-4">
      <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
      <div className="h-4 w-32 bg-bg-card rounded animate-pulse" />
      <div className="space-y-2 mt-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
