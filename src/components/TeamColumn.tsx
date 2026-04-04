"use client";

import { useState } from "react";
import Image from "next/image";
import PositionBadge from "@/components/PositionBadge";
import { avatarUrl, playerImageUrl } from "@/lib/utils";
import type { PlayerOnRoster, RosterWithUser } from "@/lib/types";

export interface DraftPick {
  season: string;
  round: number;
  pick_slot: number | null;
  pick_label: string;
  roster_id: number;
  owner_id: number;
  original_owner_name: string;
}

function RadioButton({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
        checked
          ? "border-accent bg-accent"
          : "border-text-muted/40"
      }`}
    >
      {checked && (
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      )}
    </div>
  );
}

export function PlayerCell({
  player,
  onClick,
  selectable,
  selected,
  onToggle,
}: {
  player: PlayerOnRoster;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const isDef =
    player.position === "DEF" || /^[A-Z]{2,3}$/.test(player.player_id);

  const handleClick = () => {
    if (selectable && onToggle) {
      onToggle();
    } else {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-2 px-2 h-10 cursor-pointer transition-colors rounded ${
        selected ? "bg-accent/10" : "hover:bg-bg-hover"
      }`}
    >
      <div className="w-7 h-7 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
        {isDef || imgError ? (
          <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
          </svg>
        ) : (
          <Image
            src={playerImageUrl(player.player_id)}
            alt={player.full_name}
            width={28}
            height={28}
            className="object-cover w-full h-full"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium truncate block leading-tight">
          {player.full_name}
        </span>
        <div className="flex items-center gap-1">
          <PositionBadge position={player.position} />
          {player.team && (
            <span className="text-[10px] text-text-muted">{player.team}</span>
          )}
        </div>
      </div>
      {player.injury_status && (
        <span
          className={`text-[10px] font-bold px-1 py-0.5 rounded shrink-0 ${
            player.injury_status === "IR" || player.injury_status === "Out"
              ? "bg-red-900/40 text-red-400"
              : player.injury_status === "Doubtful"
                ? "bg-orange-900/40 text-orange-400"
                : "bg-yellow-900/40 text-yellow-400"
          }`}
        >
          {player.injury_status}
        </span>
      )}
      {selectable && <RadioButton checked={!!selected} />}
    </div>
  );
}

export function EmptySlot() {
  return (
    <div className="flex items-center gap-2 px-2 h-10">
      <div className="w-7 h-7 rounded-full bg-bg-hover shrink-0" />
      <span className="text-xs text-text-muted">—</span>
    </div>
  );
}

export function pickKey(p: DraftPick): string {
  return `${p.season}-${p.round}-${p.roster_id}`;
}

export default function TeamColumn({
  roster,
  onPlayerClick,
  picks,
  seasons,
  starterCount,
  benchCount,
  reserveCount,
  onRemove,
  selectable,
  selectedPlayerIds,
  selectedPickKeys,
  onTogglePlayer,
  onTogglePick,
}: {
  roster: RosterWithUser;
  onPlayerClick: (player: PlayerOnRoster) => void;
  picks: DraftPick[];
  seasons: string[];
  starterCount: number;
  benchCount: number;
  reserveCount: number;
  onRemove?: () => void;
  selectable?: boolean;
  selectedPlayerIds?: Set<string>;
  selectedPickKeys?: Set<string>;
  onTogglePlayer?: (player: PlayerOnRoster) => void;
  onTogglePick?: (pick: DraftPick) => void;
}) {
  const avatar = avatarUrl(roster.avatar);

  const starterSet = new Set(roster.starters);
  const reserveSet = new Set(roster.reserve || []);

  const starters: (PlayerOnRoster | null)[] = roster.starters.map(
    (pid) => roster.players.find((p) => p.player_id === pid) || null
  );
  while (starters.length < starterCount) starters.push(null);

  const bench = roster.players.filter(
    (p) => !starterSet.has(p.player_id) && !reserveSet.has(p.player_id)
  );

  const reserve = roster.players.filter((p) =>
    reserveSet.has(p.player_id)
  );

  const renderPlayer = (p: PlayerOnRoster) => (
    <PlayerCell
      key={p.player_id}
      player={p}
      onClick={() => onPlayerClick(p)}
      selectable={selectable}
      selected={selectedPlayerIds?.has(p.player_id)}
      onToggle={onTogglePlayer ? () => onTogglePlayer(p) : undefined}
    />
  );

  return (
    <div className="bg-bg-card rounded-xl border border-border flex flex-col min-w-0 flex-1">
      {/* Team header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
          {avatar ? (
            <Image
              src={avatar}
              alt={roster.display_name}
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-sm font-bold text-text-muted">
              {roster.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">
            {roster.display_name}
          </div>
          <div className="text-[11px] text-text-secondary">
            {roster.wins}-{roster.losses}
            {roster.ties > 0 ? `-${roster.ties}` : ""} |{" "}
            {roster.fpts.toFixed(1)} pts
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-text-muted hover:text-red-400 transition-colors shrink-0"
            title="Remove team"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Starters */}
      <div className="px-1 pt-1">
        <div className="px-2 py-1">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Starters
          </span>
        </div>
        {starters.map((p, i) =>
          p ? renderPlayer(p) : <EmptySlot key={`starter-empty-${i}`} />
        )}
      </div>

      {/* Bench */}
      <div className="px-1 pt-1">
        <div className="px-2 py-1 border-t border-border">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Bench
          </span>
        </div>
        {Array.from({ length: benchCount }).map((_, i) => {
          const player = bench[i] || null;
          return player ? renderPlayer(player) : <EmptySlot key={`bench-empty-${i}`} />;
        })}
      </div>

      {/* IR / Taxi */}
      {reserveCount > 0 && (
        <div className="px-1 pt-1">
          <div className="px-2 py-1 border-t border-border">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              IR / Taxi
            </span>
          </div>
          {Array.from({ length: reserveCount }).map((_, i) => {
            const player = reserve[i] || null;
            return player ? renderPlayer(player) : <EmptySlot key={`reserve-empty-${i}`} />;
          })}
        </div>
      )}

      {/* Draft Picks */}
      {picks.length > 0 && (
        <div className="px-1 pt-1 pb-2">
          <div className="px-2 py-1 border-t border-border">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Draft Picks
            </span>
          </div>
          {seasons.map((season) => {
            const seasonPicks = picks.filter((p) => p.season === season);
            if (seasonPicks.length === 0) return null;
            return (
              <div key={season} className="px-2 py-1">
                <div className="text-[10px] text-text-muted mb-1">{season}</div>
                <div className="flex flex-wrap gap-1">
                  {seasonPicks.map((p) => {
                    const pk = pickKey(p);
                    const isSelected = selectedPickKeys?.has(pk);
                    return (
                      <span
                        key={pk}
                        onClick={
                          selectable && onTogglePick
                            ? (e) => { e.stopPropagation(); onTogglePick(p); }
                            : undefined
                        }
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                          isSelected
                            ? "bg-accent text-white cursor-pointer"
                            : selectable
                              ? "bg-bg-hover text-text-secondary cursor-pointer hover:bg-accent/20"
                              : "bg-bg-hover text-text-secondary"
                        }`}
                      >
                        {p.pick_label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
