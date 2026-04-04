"use client";

import Image from "next/image";
import { avatarUrl } from "@/lib/utils";
import PlayerRow from "./PlayerRow";
import type { RosterWithUser, PlayerOnRoster } from "@/lib/types";
import { useState } from "react";

interface TeamCardProps {
  roster: RosterWithUser;
  onPlayerClick: (player: PlayerOnRoster) => void;
}

export default function TeamCard({ roster, onPlayerClick }: TeamCardProps) {
  const [expanded, setExpanded] = useState(false);
  const avatar = avatarUrl(roster.avatar);

  const starters = roster.starters
    .map((pid) => roster.players.find((p) => p.player_id === pid))
    .filter(Boolean) as PlayerOnRoster[];

  const bench = roster.players.filter(
    (p) => !roster.starters.includes(p.player_id)
  );

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
          {avatar ? (
            <Image
              src={avatar}
              alt={roster.display_name}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-lg font-bold text-text-muted">
              {roster.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{roster.display_name}</div>
          <div className="text-sm text-text-secondary">
            {roster.wins}-{roster.losses}
            {roster.ties > 0 ? `-${roster.ties}` : ""} |{" "}
            {roster.fpts.toFixed(2)} pts
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-border">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Starters
            </h4>
          </div>
          <div className="divide-y divide-border">
            {starters.map((p) => (
              <PlayerRow
                key={p.player_id}
                player_id={p.player_id}
                full_name={p.full_name}
                position={p.position}
                team={p.team}
                injury_status={p.injury_status}
                isStarter
                onClick={() => onPlayerClick(p)}
              />
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Bench
            </h4>
          </div>
          <div className="divide-y divide-border">
            {bench.map((p) => (
              <PlayerRow
                key={p.player_id}
                player_id={p.player_id}
                full_name={p.full_name}
                position={p.position}
                team={p.team}
                injury_status={p.injury_status}
                onClick={() => onPlayerClick(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
