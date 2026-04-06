"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRosters } from "@/hooks/useRosters";
import { useLeagueContext } from "@/context/LeagueContext";
import PlayerModal from "@/components/PlayerModal";
import TeamColumn, { pickKey } from "@/components/TeamColumn";
import type { DraftPick } from "@/components/TeamColumn";
import Image from "next/image";
import { avatarUrl } from "@/lib/utils";
import type { PlayerOnRoster, RosterWithUser } from "@/lib/types";

interface TradeSelection {
  players: Map<string, PlayerOnRoster>; // player_id -> player
  picks: Map<string, DraftPick>; // pickKey -> pick
}

// Unique key for any trade item (player or pick) from a specific source team
function tradeItemKey(sourceRosterId: number, type: "player" | "pick", id: string): string {
  return `${sourceRosterId}-${type}-${id}`;
}

interface TradeItem {
  type: "player" | "pick";
  id: string; // player_id or pickKey
  sourceRosterId: number;
  player?: PlayerOnRoster;
  pick?: DraftPick;
}

function TradeSummaryModal({
  rosters,
  selections,
  onClose,
}: {
  rosters: RosterWithUser[];
  selections: Map<number, TradeSelection>;
  onClose: () => void;
}) {
  const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]));

  // Teams involved in the trade
  const teams = Array.from(selections.entries())
    .filter(([, sel]) => sel.players.size > 0 || sel.picks.size > 0)
    .map(([rosterId, sel]) => ({
      rosterId,
      roster: rosterMap.get(rosterId)!,
      players: Array.from(sel.players.values()),
      picks: Array.from(sel.picks.values()),
    }));

  const isTwoTeam = teams.length === 2;

  // All trade items flattened
  const allItems: TradeItem[] = [];
  for (const t of teams) {
    for (const p of t.players) {
      allItems.push({ type: "player", id: p.player_id, sourceRosterId: t.rosterId, player: p });
    }
    for (const pk of t.picks) {
      allItems.push({ type: "pick", id: pickKey(pk), sourceRosterId: t.rosterId, pick: pk });
    }
  }

  // Assignments: tradeItemKey -> destRosterId
  const [assignments, setAssignments] = useState<Map<string, number>>(() => {
    const init = new Map<string, number>();
    // Auto-assign for 2-team trades
    if (isTwoTeam) {
      const [teamA, teamB] = teams;
      for (const p of teamA.players) {
        init.set(tradeItemKey(teamA.rosterId, "player", p.player_id), teamB.rosterId);
      }
      for (const pk of teamA.picks) {
        init.set(tradeItemKey(teamA.rosterId, "pick", pickKey(pk)), teamB.rosterId);
      }
      for (const p of teamB.players) {
        init.set(tradeItemKey(teamB.rosterId, "player", p.player_id), teamA.rosterId);
      }
      for (const pk of teamB.picks) {
        init.set(tradeItemKey(teamB.rosterId, "pick", pickKey(pk)), teamA.rosterId);
      }
    }
    return init;
  });

  // Currently selected item waiting for destination
  const [pendingItemKey, setPendingItemKey] = useState<string | null>(null);

  const assignItem = (destRosterId: number) => {
    if (!pendingItemKey) return;
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(pendingItemKey, destRosterId);
      return next;
    });
    setPendingItemKey(null);
  };

  const unassignItem = (itemKey: string) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      next.delete(itemKey);
      return next;
    });
  };

  const isAssigned = (itemKey: string) => assignments.has(itemKey);

  // Items received by a specific team
  const getReceivedItems = (destRosterId: number): (TradeItem & { itemKey: string })[] => {
    const items: (TradeItem & { itemKey: string })[] = [];
    for (const item of allItems) {
      const key = tradeItemKey(item.sourceRosterId, item.type, item.id);
      if (assignments.get(key) === destRosterId) {
        items.push({ ...item, itemKey: key });
      }
    }
    return items;
  };

  // Eligible destination teams for the pending item (can't send to own team)
  const pendingSourceRosterId = pendingItemKey
    ? allItems.find(
        (i) => tradeItemKey(i.sourceRosterId, i.type, i.id) === pendingItemKey
      )?.sourceRosterId
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => { setPendingItemKey(null); onClose(); }}
    >
      <div
        className="bg-bg-card rounded-xl border border-border max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Trade Summary</h2>
            {!isTwoTeam && pendingItemKey && (
              <p className="text-xs text-accent mt-0.5">Click a team&apos;s &quot;Receives&quot; column to assign the selected item</p>
            )}
            {!isTwoTeam && !pendingItemKey && (
              <p className="text-xs text-text-muted mt-0.5">Click an unassigned item on the left, then click a destination team on the right</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {teams.map(({ rosterId, roster, players, picks }) => {
            const av = avatarUrl(roster.avatar);
            const received = getReceivedItems(rosterId);
            const isValidDest = pendingItemKey && pendingSourceRosterId !== rosterId;

            return (
              <div key={rosterId} className="border border-border rounded-lg overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-hover/50">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
                    {av ? (
                      <Image src={av} alt={roster.display_name} width={24} height={24} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-[10px] font-bold text-text-muted">{roster.display_name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-semibold text-sm">{roster.display_name}</span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-border">
                  {/* Trades Away */}
                  <div className="p-3">
                    <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Trades Away</div>
                    <div className="space-y-1">
                      {players.map((p) => {
                        const key = tradeItemKey(rosterId, "player", p.player_id);
                        const assigned = isAssigned(key);
                        const isPending = pendingItemKey === key;
                        return (
                          <div
                            key={p.player_id}
                            onClick={() => {
                              if (!isTwoTeam && !assigned) {
                                setPendingItemKey(isPending ? null : key);
                              }
                            }}
                            className={`flex items-center gap-2 text-sm px-2 py-1 rounded transition-colors ${
                              isPending
                                ? "bg-accent/20 ring-1 ring-accent cursor-pointer"
                                : !assigned && !isTwoTeam
                                  ? "hover:bg-bg-hover cursor-pointer"
                                  : assigned
                                    ? "opacity-40"
                                    : ""
                            }`}
                          >
                            <span className="text-red-400 text-xs font-mono shrink-0">-</span>
                            <span className="truncate">{p.full_name}</span>
                            <span className="text-text-muted text-xs shrink-0">({p.position})</span>
                          </div>
                        );
                      })}
                      {picks.map((pk) => {
                        const key = tradeItemKey(rosterId, "pick", pickKey(pk));
                        const assigned = isAssigned(key);
                        const isPending = pendingItemKey === key;
                        return (
                          <div
                            key={pickKey(pk)}
                            onClick={() => {
                              if (!isTwoTeam && !assigned) {
                                setPendingItemKey(isPending ? null : key);
                              }
                            }}
                            className={`flex items-center gap-2 text-sm px-2 py-1 rounded transition-colors ${
                              isPending
                                ? "bg-accent/20 ring-1 ring-accent cursor-pointer"
                                : !assigned && !isTwoTeam
                                  ? "hover:bg-bg-hover cursor-pointer"
                                  : assigned
                                    ? "opacity-40"
                                    : ""
                            }`}
                          >
                            <span className="text-red-400 text-xs font-mono shrink-0">-</span>
                            <span className="font-mono truncate">{pk.season} {pk.pick_label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Receives */}
                  <div
                    className={`p-3 transition-colors ${
                      isValidDest ? "bg-accent/5 cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (isValidDest) assignItem(rosterId);
                    }}
                  >
                    <div className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2">Receives</div>
                    <div className="space-y-1">
                      {received.length === 0 && (
                        <span className={`text-xs ${isValidDest ? "text-accent" : "text-text-muted"}`}>
                          {isValidDest ? "Click to assign here" : "—"}
                        </span>
                      )}
                      {received.map((item) => {
                        const sourceRoster = rosterMap.get(item.sourceRosterId);
                        return (
                          <div
                            key={item.itemKey}
                            className="flex items-center gap-2 text-sm px-2 py-1 rounded group"
                          >
                            <span className="text-green-400 text-xs font-mono shrink-0">+</span>
                            {item.type === "player" && item.player && (
                              <>
                                <span className="truncate">{item.player.full_name}</span>
                                <span className="text-text-muted text-xs shrink-0">({item.player.position})</span>
                              </>
                            )}
                            {item.type === "pick" && item.pick && (
                              <span className="font-mono truncate">{item.pick.season} {item.pick.pick_label}</span>
                            )}
                            <span className="text-text-muted text-[10px] shrink-0 ml-auto">
                              from {sourceRoster?.display_name}
                            </span>
                            {!isTwoTeam && (
                              <button
                                onClick={(e) => { e.stopPropagation(); unassignItem(item.itemKey); }}
                                className="text-text-muted hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {isValidDest && received.length > 0 && (
                        <div className="text-xs text-accent px-2 py-0.5">Click to assign here</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-hover rounded-lg text-sm font-medium hover:bg-border transition-colors"
          >
            Close
          </button>
          {!isTwoTeam && (
            <button
              onClick={() => { setAssignments(new Map()); setPendingItemKey(null); }}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeBuilder() {
  const { loading: leagueLoading, league } = useLeagueContext();
  const { rosters, loading: rostersLoading } = useRosters();
  const [selectedRosterIds, setSelectedRosterIds] = useState<number[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOnRoster | null>(null);
  const [picksByOwner, setPicksByOwner] = useState<Record<number, DraftPick[]>>({});
  const [pickSeasons, setPickSeasons] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Selection state per roster: roster_id -> { players, picks }
  const [selections, setSelections] = useState<Map<number, TradeSelection>>(new Map());

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

  const selectedRosters = useMemo(
    () =>
      selectedRosterIds
        .map((id) => rosters.find((r) => r.roster_id === id))
        .filter(Boolean) as RosterWithUser[],
    [selectedRosterIds, rosters]
  );

  const availableRosters = rosters.filter(
    (r) => !selectedRosterIds.includes(r.roster_id)
  );

  const allTeamsAdded = availableRosters.length === 0;

  const addTeam = (rosterId: number) => {
    setSelectedRosterIds((prev) => [...prev, rosterId]);
    setDropdownOpen(false);
  };

  const removeTeam = (rosterId: number) => {
    setSelectedRosterIds((prev) => prev.filter((id) => id !== rosterId));
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(rosterId);
      return next;
    });
  };

  const togglePlayer = useCallback((rosterId: number, player: PlayerOnRoster) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const sel = next.get(rosterId) || { players: new Map(), picks: new Map() };
      const players = new Map(sel.players);
      if (players.has(player.player_id)) {
        players.delete(player.player_id);
      } else {
        players.set(player.player_id, player);
      }
      next.set(rosterId, { ...sel, players });
      return next;
    });
  }, []);

  const togglePick = useCallback((rosterId: number, pick: DraftPick) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const sel = next.get(rosterId) || { players: new Map(), picks: new Map() };
      const picks = new Map(sel.picks);
      const pk = pickKey(pick);
      if (picks.has(pk)) {
        picks.delete(pk);
      } else {
        picks.set(pk, pick);
      }
      next.set(rosterId, { ...sel, picks });
      return next;
    });
  }, []);

  // Show Create Trade when at least 2 teams have selections
  const teamsWithSelections = useMemo(() => {
    let count = 0;
    for (const [, sel] of selections) {
      if (sel.players.size > 0 || sel.picks.size > 0) count++;
    }
    return count;
  }, [selections]);

  const canCreateTrade = teamsWithSelections >= 2;

  if (loading) {
    return (
      <div className="fixed inset-0 top-14 overflow-auto bg-bg-primary z-0">
        <div className="px-8 py-8">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 flex-1 bg-bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-14 overflow-auto bg-bg-primary z-0">
      <div className="px-8 py-8">
        {/* Controls row */}
        <div className="flex justify-center items-center gap-3 mb-4">
          {selections.size > 0 && (
            <button
              onClick={() => setSelections(new Map())}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => !allTeamsAdded && setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-6 py-3 bg-bg-card rounded-lg border border-border border-dashed transition-colors ${
                allTeamsAdded
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-accent hover:bg-bg-hover cursor-pointer"
              }`}
            >
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium text-text-secondary">Add Team</span>
            </button>

            {dropdownOpen && !allTeamsAdded && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-bg-card rounded-xl border border-border shadow-lg z-10 max-h-80 overflow-y-auto w-56">
                {availableRosters.map((r) => {
                  const av = avatarUrl(r.avatar);
                  return (
                    <button
                      key={r.roster_id}
                      onClick={() => addTeam(r.roster_id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
                        {av ? (
                          <Image
                            src={av}
                            alt={r.display_name}
                            width={28}
                            height={28}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-xs font-bold text-text-muted">
                            {r.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium">{r.display_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {canCreateTrade && (
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create Trade
            </button>
          )}
        </div>

        {/* Team columns */}
        {selectedRosters.length > 0 ? (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${selectedRosters.length}, minmax(0, 1fr))`,
            }}
          >
            {selectedRosters.map((r) => {
              const sel = selections.get(r.roster_id);
              return (
                <TeamColumn
                  key={r.roster_id}
                  roster={r}
                  onPlayerClick={setSelectedPlayer}
                  picks={picksByOwner[r.roster_id] || []}
                  seasons={pickSeasons}
                  starterCount={starterCount}
                  benchCount={benchCount}
                  reserveCount={reserveCount}
                  onRemove={() => removeTeam(r.roster_id)}
                  selectable
                  selectedPlayerIds={sel ? new Set(sel.players.keys()) : undefined}
                  selectedPickKeys={sel ? new Set(sel.picks.keys()) : undefined}
                  onTogglePlayer={(p) => togglePlayer(r.roster_id, p)}
                  onTogglePick={(pk) => togglePick(r.roster_id, pk)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-10">
            Add teams to compare rosters for a trade.
          </p>
        )}
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showSummary && (
        <TradeSummaryModal
          rosters={rosters}
          selections={selections}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}

export default function TradesPage() {
  return <TradeBuilder />;
}
