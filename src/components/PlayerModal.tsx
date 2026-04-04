"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { playerImageUrl } from "@/lib/utils";
import PositionBadge from "./PositionBadge";
import SeasonSelector from "./SeasonSelector";
import GameLogTable from "./GameLogTable";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useLeagueContext } from "@/context/LeagueContext";
import type { PlayerOnRoster } from "@/lib/types";

interface PlayerModalProps {
  player: PlayerOnRoster;
  onClose: () => void;
}

interface PlayerBio {
  age: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  years_exp: number;
  injury_status: string | null;
}

export default function PlayerModal({ player, onClose }: PlayerModalProps) {
  const { league, nflState } = useLeagueContext();
  const leagueSeason = league ? parseInt(league.season) : new Date().getFullYear() - 1;
  // During offseason (week 0), the most recent completed season is leagueSeason - 1
  const latestCompletedSeason =
    nflState?.season_type === "off" ? leagueSeason - 1 : leagueSeason;
  // Always show 5 seasons back so users can browse history
  const seasons = Array.from(
    { length: 5 },
    (_, i) => latestCompletedSeason - i
  ).filter((y) => y >= 2020);

  const [selectedSeason, setSelectedSeason] = useState(
    seasons[0] || latestCompletedSeason
  );
  const [bio, setBio] = useState<PlayerBio | null>(null);
  const [imgError, setImgError] = useState(false);

  const { stats, loading } = usePlayerStats(player.player_id, selectedSeason);

  const isDef =
    player.position === "DEF" || /^[A-Z]{2,3}$/.test(player.player_id);

  useEffect(() => {
    fetch(`/api/players/${player.player_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setBio(d);
      })
      .catch(() => {});
  }, [player.player_id]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-border">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
            {isDef || imgError ? (
              <svg
                className="w-10 h-10 text-text-muted"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              </svg>
            ) : (
              <Image
                src={playerImageUrl(player.player_id)}
                alt={player.full_name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold truncate">
                {player.full_name}
              </h2>
              <button
                onClick={onClose}
                className="ml-auto text-text-muted hover:text-text-primary text-2xl leading-none shrink-0"
              >
                x
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <PositionBadge position={player.position} />
              {player.team && (
                <span className="text-sm text-text-secondary">
                  {player.team}
                </span>
              )}
              {(bio?.injury_status || player.injury_status) && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">
                  {bio?.injury_status || player.injury_status}
                </span>
              )}
            </div>
            {bio && (
              <p className="text-xs text-text-muted flex flex-wrap gap-x-3">
                {bio.age && <span>Age {bio.age}</span>}
                {bio.height && <span>{bio.height}</span>}
                {bio.weight && <span>{bio.weight} lbs</span>}
                {player.years_exp > 0 && (
                  <span>
                    {player.years_exp} yr{player.years_exp > 1 ? "s" : ""} exp
                  </span>
                )}
                {bio.college && <span>{bio.college}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Season selector + game log */}
        <div className="p-6">
          {seasons.length > 1 && (
            <div className="mb-4">
              <SeasonSelector
                seasons={seasons}
                selected={selectedSeason}
                onSelect={setSelectedSeason}
              />
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 bg-bg-card rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <GameLogTable stats={stats} position={player.position} />
          )}
        </div>
      </div>
    </div>
  );
}
