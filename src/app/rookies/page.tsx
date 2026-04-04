"use client";

import { useState, useEffect } from "react";
import PositionBadge from "@/components/PositionBadge";
import PlayerModal from "@/components/PlayerModal";
import type { PlayerOnRoster } from "@/lib/types";

interface Rookie {
  rank: number;
  name: string;
  position: string;
  sleeper_id: string | null;
  value: number;
  overall_rank: number;
  position_rank: number;
  trend: number;
  age: number | null;
}

export default function RookiesPage() {
  const [rookies, setRookies] = useState<Rookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(
    null
  );
  const [posFilter, setPosFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/rookies")
      .then((r) => (r.ok ? r.json() : { rookies: [] }))
      .then((data) => setRookies(data.rookies || []))
      .catch(() => setRookies([]))
      .finally(() => setLoading(false));
  }, []);

  const positions = ["ALL", "QB", "RB", "WR", "TE"];
  const filtered =
    posFilter === "ALL"
      ? rookies
      : rookies.filter((r) => r.position === posFilter);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">2026 Rookie Rankings</h1>
        <div className="flex gap-1">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                posFilter === pos
                  ? "bg-accent text-white"
                  : "bg-bg-card text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary text-center py-10">
          No rookie data available.
        </p>
      ) : (
        <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase w-16">
                  Rank
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase">
                  Player
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase w-20 hidden sm:table-cell">
                  Pos Rank
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase w-20">
                  Value
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase w-24 hidden sm:table-cell">
                  30d Trend
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase w-20">
                  Overall
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.rank}
                  className={`border-b border-border cursor-pointer hover:bg-bg-hover transition-colors ${
                    i % 2 === 0 ? "" : "bg-bg-primary/30"
                  }`}
                  onClick={() => {
                    if (r.sleeper_id) {
                      setSelectedPlayer({
                        player_id: r.sleeper_id,
                        full_name: r.name,
                        first_name: "",
                        last_name: "",
                        position: r.position,
                        team: null,
                        injury_status: null,
                        years_exp: 0,
                        age: null,
                      });
                    }
                  }}
                >
                  <td className="px-4 py-2.5 font-mono text-text-muted">
                    {r.rank}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <PositionBadge position={r.position} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-secondary hidden sm:table-cell">
                    {r.position}{r.position_rank}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {r.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    <span
                      className={
                        r.trend > 0
                          ? "text-green-400"
                          : r.trend < 0
                            ? "text-red-400"
                            : "text-text-muted"
                      }
                    >
                      {r.trend > 0 ? "+" : ""}
                      {r.trend}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-secondary">
                    #{r.overall_rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
