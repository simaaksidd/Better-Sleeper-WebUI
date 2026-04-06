"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { playerImageUrl } from "@/lib/utils";
import { POSITION_COLORS } from "@/lib/constants";
import PositionBadge from "./PositionBadge";
import SeasonSelector from "./SeasonSelector";
import GameLogTable from "./GameLogTable";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { usePlayerNews } from "@/hooks/usePlayerNews";
import { useDepthChart } from "@/hooks/useDepthChart";
import { useLeagueContext } from "@/context/LeagueContext";
import type { PlayerOnRoster } from "@/lib/types";
import type { NewsItem } from "@/hooks/usePlayerNews";
import type { DepthChartData } from "@/hooks/useDepthChart";

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
  espn_id: number | null;
  number: number | null;
}

export default function PlayerModal({ player, onClose }: PlayerModalProps) {
  const { league, nflState } = useLeagueContext();
  const leagueSeason = league ? parseInt(league.season) : new Date().getFullYear() - 1;
  const latestCompletedSeason =
    nflState?.season_type === "off" ? leagueSeason - 1 : leagueSeason;
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
  const { news, sources: newsSources, loading: newsLoading } = usePlayerNews(player.player_id);
  const { depthChart, loading: depthLoading } = useDepthChart(player.team);

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

  const posColor = POSITION_COLORS[player.position] || "#888";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div
          className="flex items-start gap-4 p-6 border-b border-border shrink-0"
          style={{
            background: `linear-gradient(135deg, ${posColor}18 0%, transparent 60%)`,
          }}
        >
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center relative">
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
              <h2 className="text-2xl font-bold truncate">
                {player.full_name}
              </h2>
              <button
                onClick={onClose}
                className="ml-auto text-text-muted hover:text-text-primary text-2xl leading-none shrink-0"
              >
                x
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <PositionBadge position={player.position} />
              {player.team && (
                <span className="text-sm font-semibold text-text-secondary">
                  {player.team}
                  {bio?.number != null && ` #${bio.number}`}
                </span>
              )}
              {(bio?.injury_status || player.injury_status) && (
                <InjuryBadge
                  status={bio?.injury_status || player.injury_status!}
                />
              )}
            </div>
            {bio && (
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {bio.age != null && (
                  <BioStat label="AGE" value={String(bio.age)} />
                )}
                {bio.height && <BioStat label="HEIGHT" value={bio.height} />}
                {bio.weight && (
                  <BioStat label="WEIGHT" value={`${bio.weight} lbs`} />
                )}
                {player.years_exp > 0 && (
                  <BioStat label="EXP" value={String(player.years_exp)} />
                )}
                {bio.college && (
                  <BioStat label="COLLEGE" value={bio.college} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Body: two-column layout ── */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Game Log (65%) */}
          <div className="flex-[65] min-w-0 border-r border-border overflow-hidden p-6 flex flex-col">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Game Logs
            </h3>

            {seasons.length > 1 && (
              <div className="mb-4">
                <SeasonSelector
                  seasons={seasons}
                  selected={selectedSeason}
                  onSelect={setSelectedSeason}
                />
              </div>
            )}

            <div className="flex-1 min-h-0 min-w-0 flex flex-col">
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

          {/* Right: Sidebar (35%) */}
          <div className="flex-[35] flex flex-col min-h-0">
            {/* News section */}
            <div className="flex-1 overflow-y-auto p-4 border-b border-border">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Latest News
              </h3>
              <NewsSection news={news} sources={newsSources} loading={newsLoading} />
            </div>

            {/* Depth Chart section */}
            {player.team && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Depth Chart
                </h3>
                <DepthChartSection
                  depthChart={depthChart}
                  loading={depthLoading}
                  currentPlayerId={player.player_id}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function BioStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function InjuryBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  let color = "bg-red-900/40 text-red-400";
  if (lower === "questionable") color = "bg-yellow-900/40 text-yellow-400";
  else if (lower === "doubtful") color = "bg-orange-900/40 text-orange-400";

  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function NewsSection({
  news,
  sources,
  loading,
}: {
  news: NewsItem[];
  sources?: string[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-3/4 bg-bg-card rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-bg-card rounded animate-pulse" />
            <div className="h-3 w-full bg-bg-card rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <p className="text-sm text-text-muted">No recent news</p>
    );
  }

  return (
    <div className="space-y-4">
      {sources && sources.length > 0 && (
        <p className="text-[10px] text-text-muted -mt-1">
          via {sources.join(", ")}
        </p>
      )}
      {news.map((item, i) => (
        <article key={i} className={i > 0 ? "pt-4 border-t border-border" : ""}>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold hover:text-accent transition-colors leading-snug block mb-1"
            >
              {item.headline}
            </a>
          ) : (
            <h4 className="text-sm font-semibold leading-snug mb-1">
              {item.headline}
            </h4>
          )}
          <div className="flex items-center gap-1.5 mb-1.5">
            {item.published && (
              <span className="text-[11px] text-text-muted">
                {timeAgo(item.published)}
              </span>
            )}
            {item.source && (
              <span className="text-[10px] text-text-muted opacity-60">
                {item.source}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-text-secondary leading-relaxed">
              {item.description}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

// Offense-first ordering for depth chart display
const DEPTH_CHART_ORDER = [
  "QB",
  "RB",
  "WR1",
  "WR2",
  "WR3",
  "TE",
  "OL",
  "K",
  "P",
  "LS",
  // Defense
  "LDE",
  "RDE",
  "NT",
  "DL",
  "LOLB",
  "ROLB",
  "LILB",
  "RILB",
  "LB",
  "LCB",
  "RCB",
  "NB",
  "DB",
  "FS",
  "SS",
];

function DepthChartSection({
  depthChart,
  loading,
  currentPlayerId,
}: {
  depthChart: DepthChartData;
  loading: boolean;
  currentPlayerId: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 bg-bg-card rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const positions = Object.keys(depthChart);
  if (positions.length === 0) {
    return (
      <p className="text-sm text-text-muted">Depth chart unavailable</p>
    );
  }

  // Sort positions by the predefined order; unknown positions go at the end
  const sorted = [...positions].sort((a, b) => {
    const ia = DEPTH_CHART_ORDER.indexOf(a);
    const ib = DEPTH_CHART_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="space-y-2">
      {sorted.map((pos) => {
        const players = depthChart[pos];
        if (!players || players.length === 0) return null;
        const posColor = getDepthChartPosColor(pos);

        return (
          <div key={pos} className="flex items-start gap-2">
            <span
              className="text-xs font-bold shrink-0 w-10 text-right"
              style={{ color: posColor }}
            >
              {pos}
            </span>
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              {players.map((p, i) => {
                const isCurrent = p.player_id === currentPlayerId;
                return (
                  <span
                    key={p.player_id}
                    className={`text-xs ${
                      isCurrent
                        ? "font-bold text-accent"
                        : i === 0
                          ? "text-text-primary"
                          : "text-text-muted"
                    }`}
                  >
                    {p.full_name}
                    {i < players.length - 1 && ","}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getDepthChartPosColor(pos: string): string {
  if (pos === "QB") return POSITION_COLORS.QB;
  if (pos === "RB") return POSITION_COLORS.RB;
  if (pos.startsWith("WR")) return POSITION_COLORS.WR;
  if (pos === "TE") return POSITION_COLORS.TE;
  if (pos === "K" || pos === "P" || pos === "LS") return POSITION_COLORS.K;
  // Defense / OL — muted
  return "#8899aa";
}
