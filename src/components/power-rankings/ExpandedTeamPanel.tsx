"use client";

import { useState, useRef } from "react";
import { POSITION_COLORS } from "@/lib/constants";
import PositionBadge from "@/components/PositionBadge";
import { avatarUrl } from "@/lib/utils";
import RankBadge from "./RankBadge";
import TierBadge from "./TierBadge";
import type { PRTeam, PRPositionGroup, PRDraftGroup } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("en-US");

const POS_KEYS = ["QB", "RB", "WR", "TE"] as const;

/** Interpolate from green (#16a34a) to red (#dc2626) based on t (0 = green, 1 = red) */
function gradientColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(0x16 + (0xdc - 0x16) * clamped);
  const g = Math.round(0xa3 + (0x26 - 0xa3) * clamped);
  const b = Math.round(0x4a + (0x26 - 0x4a) * clamped);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function rankColor(rank: number, totalTeams: number): string {
  return gradientColor((rank - 1) / Math.max(totalTeams - 1, 1));
}

function ageColor(age: number): string {
  // 21 = fully green, 32+ = fully red
  return gradientColor((age - 21) / 11);
}

interface Tag {
  label: string;
  description: string;
}

function computeTags(team: PRTeam): Tag[] {
  const tags: Tag[] = [];
  const { QB, RB, WR, TE, DRAFT } = team.positions;
  const totalValue = team.overall_value;
  const playerValue = totalValue - DRAFT.value;
  const posValues = { QB: QB.value, RB: RB.value, WR: WR.value, TE: TE.value };

  // Position lover: a position is 35%+ of player value
  if (playerValue > 0) {
    if (posValues.QB / playerValue >= 0.35) tags.push({ label: "QB Lover", description: "Hoarding quarterbacks" });
    if (posValues.RB / playerValue >= 0.35) tags.push({ label: "RB Lover", description: "Running back hoarder" });
    if (posValues.WR / playerValue >= 0.35) tags.push({ label: "WR Lover", description: "Stacking wide receivers" });
    if (posValues.TE / playerValue >= 0.35) tags.push({ label: "TE Lover", description: "Tight end enthusiast" });
  }

  // Gambler: draft picks > 50% of total value
  if (totalValue > 0 && DRAFT.value / totalValue > 0.5) {
    tags.push({ label: "Gambler", description: "Betting it all on draft picks" });
  }

  // Unc: old roster
  if (team.avg_age >= 27) {
    tags.push({ label: "Unc", description: "The oldest roster in the room" });
  }

  // Lil Bro: young roster
  if (team.avg_age > 0 && team.avg_age < 24.5) {
    tags.push({ label: "Lil Bro", description: "Youngest squad in the league" });
  }

  // Top Heavy: single player is 25%+ of total player value
  const allPlayers = [...QB.players, ...RB.players, ...WR.players, ...TE.players];
  if (playerValue > 0 && allPlayers.length > 0) {
    const topPlayer = allPlayers.reduce((a, b) => (a.value > b.value ? a : b));
    if (topPlayer.value / playerValue >= 0.25) {
      tags.push({ label: "Top Heavy", description: `${topPlayer.name} is carrying this team` });
    }
  }

  // Deep: 8+ players worth 1000+ value
  const valuablePlayers = allPlayers.filter((p) => p.value >= 1000);
  if (valuablePlayers.length >= 8) {
    tags.push({ label: "Deep", description: "Rostered talent everywhere" });
  }

  // Bench Warmer: starters are < 50% of total player value
  const starterValue = team.starter_value;
  if (playerValue > 0 && starterValue / playerValue < 0.5) {
    tags.push({ label: "Bench Mob", description: "More value on the bench than starting" });
  }

  // Trade Addict: 3+ picks acquired via trade
  const tradedPicks = DRAFT.picks.filter((p) => p.via !== null);
  if (tradedPicks.length >= 5) {
    tags.push({ label: "Trade Addict", description: "Can't stop making deals" });
  }

  // Balanced: no position is more than 30% of player value and none less than 15%
  if (playerValue > 0) {
    const ratios = Object.values(posValues).map((v) => v / playerValue);
    if (ratios.every((r) => r >= 0.15 && r <= 0.30)) {
      tags.push({ label: "Balanced", description: "No weaknesses, no standouts" });
    }
  }

  return tags;
}

interface Props {
  team: PRTeam;
  totalTeams: number;
  onPlayerClick: (sleeperId: string, name: string) => void;
}

export default function ExpandedTeamPanel({ team, totalTeams, onPlayerClick }: Props) {
  const avatar = avatarUrl(team.avatar);
  const tags = computeTags(team);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 p-4 bg-bg-card border-t border-border animate-in">
      {/* Team Summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {avatar && (
            <img
              src={avatar}
              alt=""
              className="w-8 h-8 rounded"
            />
          )}
          <span className="font-bold text-text-primary">{team.owner_name}</span>
        </div>

        <TierBadge
          label={team.contender_tier}
          color={team.contender_color}
          bgColor={team.contender_bg_color}
        />

        <div>
          <div className="text-xs text-text-muted">Overall Rank</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: rankColor(team.overall_rank, totalTeams) }}>{team.overall_rank}</span>
            <span className="text-xs text-text-muted">(Value: {fmt(team.overall_value)})</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted">Starter Rank</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: rankColor(team.starter_rank, totalTeams) }}>{team.starter_rank}</span>
            <span className="text-xs text-text-muted">(Value: {fmt(team.starter_value)})</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted">Avg Age</div>
          <div className="text-2xl font-bold" style={{ color: team.avg_age ? ageColor(team.avg_age) : undefined }}>{team.avg_age || "—"}</div>
        </div>

        {team.team_needs.length > 0 && (
          <div>
            <div className="text-xs text-text-muted mb-1">Team Needs</div>
            <div className="flex gap-1 flex-wrap">
              {team.team_needs.map((pos) => (
                <PositionBadge key={pos} position={pos} />
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <div className="text-xs text-text-muted mb-1">Tags</div>
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag) => (
                <TagBadge key={tag.label} label={tag.label} description={tag.description} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Position Columns */}
      {POS_KEYS.map((pos) => {
        const group = team.positions[pos] as PRPositionGroup;
        const color = POSITION_COLORS[pos] || "#6b7280";
        return (
          <PositionColumn
            key={pos}
            label={pos}
            group={group}
            color={color}
            onPlayerClick={onPlayerClick}
          />
        );
      })}

      {/* Draft Column */}
      <DraftColumn
        group={team.positions.DRAFT}
        color={POSITION_COLORS.DRAFT}
      />
    </div>
  );
}

function PositionColumn({
  label,
  group,
  color,
  onPlayerClick,
}: {
  label: string;
  group: PRPositionGroup;
  color: string;
  onPlayerClick: (sleeperId: string, name: string) => void;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div
        className="px-3 py-2 space-y-0.5"
        style={{ backgroundColor: color + "22" }}
      >
        <div className="flex items-center gap-2">
          <RankBadge rank={group.rank} />
          <span className="text-xs font-bold text-text-primary">
            {label} Rank
          </span>
        </div>
        <div className="text-xs text-text-secondary">
          Value: {fmt(group.value)}
        </div>
        <div className="text-xs text-text-secondary">
          Age: {group.avg_age || "—"}
        </div>
      </div>

      {/* Player List */}
      <div className="divide-y divide-border">
        {group.players.map((p) => (
          <button
            key={p.sleeper_id}
            onClick={() => onPlayerClick(p.sleeper_id, p.name)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-bg-hover transition-colors"
          >
            <span className="w-4 text-center shrink-0" style={{ color: "#fbbf24" }}>
              {p.is_starter ? "★" : ""}
            </span>
            <span className="text-sm text-text-primary truncate flex-1 hover:underline cursor-pointer">
              {p.name}
            </span>
            <span className="text-xs font-mono text-text-primary shrink-0">
              {fmt(p.value)}
            </span>
          </button>
        ))}
        {group.players.length === 0 && (
          <div className="px-3 py-2 text-xs text-text-muted">None</div>
        )}
      </div>
    </div>
  );
}

function TagBadge({ label, description }: { label: string; description: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function handleEnter() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    setShow(true);
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold cursor-default"
        style={{ backgroundColor: "#f59e0b22", color: "#fbbf24" }}
      >
        {label}
      </span>
      {show && (
        <span
          className="fixed -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-normal text-text-primary bg-bg-card border border-border shadow-sm z-[9999] pointer-events-none whitespace-nowrap"
          style={{ top: pos.top, left: pos.left }}
        >
          {description}
        </span>
      )}
    </>
  );
}

function DraftColumn({
  group,
  color,
}: {
  group: PRDraftGroup;
  color: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div
        className="px-3 py-2 space-y-0.5"
        style={{ backgroundColor: color + "22" }}
      >
        <div className="flex items-center gap-2">
          <RankBadge rank={group.rank} />
          <span className="text-xs font-bold text-text-primary">
            Draft Rank
          </span>
        </div>
        <div className="text-xs text-text-secondary">
          Value: {fmt(group.value)}
        </div>
      </div>

      {/* Pick List */}
      <div className="divide-y divide-border">
        {group.picks.map((pick, i) => (
          <div key={i} className="px-3 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary truncate">
                {pick.label}
              </span>
              <span className="text-xs font-mono text-text-primary shrink-0 ml-2">
                {fmt(pick.value)}
              </span>
            </div>
            {pick.via && (
              <div className="text-[11px] text-text-muted italic">
                via {pick.via}
              </div>
            )}
          </div>
        ))}
        {group.picks.length === 0 && (
          <div className="px-3 py-2 text-xs text-text-muted">No picks</div>
        )}
      </div>
    </div>
  );
}
