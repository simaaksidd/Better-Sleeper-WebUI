"use client";

import type { ResolvedTrade, PlayerOnRoster } from "@/lib/types";
import Image from "next/image";
import { avatarUrl } from "@/lib/utils";
import PositionBadge from "./PositionBadge";

interface TradeCardProps {
  trade: ResolvedTrade;
  onPlayerClick: (player: PlayerOnRoster) => void;
}

export default function TradeCard({ trade, onPlayerClick }: TradeCardProps) {
  const date = new Date(trade.created);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          Week {trade.week} | {dateStr}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trade.sides.map((side) => {
          const avatar = avatarUrl(side.avatar);
          return (
            <div
              key={side.roster_id}
              className="bg-bg-primary rounded-lg p-3 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={side.display_name}
                      width={24}
                      height={24}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs font-bold text-text-muted">
                      {side.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold">
                  {side.display_name} receives:
                </span>
              </div>
              <div className="space-y-1">
                {side.players_received.map((p) => (
                  <div
                    key={p.player_id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent transition-colors"
                    onClick={() =>
                      onPlayerClick({
                        player_id: p.player_id,
                        full_name: p.full_name || p.player_id,
                        first_name: p.first_name || "",
                        last_name: p.last_name || "",
                        position: p.position || "Unknown",
                        team: p.team || null,
                        injury_status: null,
                        years_exp: 0,
                        age: null,
                      })
                    }
                  >
                    <PositionBadge position={p.position || "Unknown"} />
                    <span>{p.full_name || p.player_id}</span>
                  </div>
                ))}
                {side.draft_picks_received.map((dp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-bg-hover text-text-muted">
                      PICK
                    </span>
                    <span>
                      {dp.season} Round {dp.round} ({dp.original_owner})
                    </span>
                  </div>
                ))}
                {side.players_received.length === 0 &&
                  side.draft_picks_received.length === 0 && (
                    <span className="text-text-muted text-xs italic">
                      Nothing
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
