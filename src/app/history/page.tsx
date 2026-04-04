"use client";

import { useState, useEffect } from "react";
import TradeCard from "@/components/TradeCard";
import PlayerModal from "@/components/PlayerModal";
import type { ResolvedTrade, PlayerOnRoster } from "@/lib/types";

export default function HistoryPage() {
  const [trades, setTrades] = useState<ResolvedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(null);

  useEffect(() => {
    fetch("/api/trades")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTrades)
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Trade History</h1>
      {trades.length === 0 ? (
        <p className="text-text-secondary text-center py-10">
          No trades found in this league.
        </p>
      ) : (
        <div className="space-y-4">
          {trades.map((t) => (
            <TradeCard
              key={t.transaction_id}
              trade={t}
              onPlayerClick={setSelectedPlayer}
            />
          ))}
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
