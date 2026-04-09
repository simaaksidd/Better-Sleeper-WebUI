"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { avatarUrl } from "@/lib/utils";
import RankBadge from "./RankBadge";
import TierBadge from "./TierBadge";
import ExpandedTeamPanel from "./ExpandedTeamPanel";
import type { PRTeam } from "@/lib/types";

type SortKey =
  | "overall_rank"
  | "starter_rank"
  | "qb_rank"
  | "rb_rank"
  | "wr_rank"
  | "te_rank"
  | "draft_rank";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "overall_rank", label: "Overall" },
  { key: "starter_rank", label: "Starter" },
  { key: "qb_rank", label: "QB" },
  { key: "rb_rank", label: "RB" },
  { key: "wr_rank", label: "WR" },
  { key: "te_rank", label: "TE" },
  { key: "draft_rank", label: "Draft" },
];

function getRankValue(team: PRTeam, key: SortKey): number {
  switch (key) {
    case "overall_rank": return team.overall_rank;
    case "starter_rank": return team.starter_rank;
    case "qb_rank": return team.positions.QB.rank;
    case "rb_rank": return team.positions.RB.rank;
    case "wr_rank": return team.positions.WR.rank;
    case "te_rank": return team.positions.TE.rank;
    case "draft_rank": return team.positions.DRAFT.rank;
  }
}

interface Props {
  teams: PRTeam[];
  onPlayerClick: (sleeperId: string, name: string) => void;
}

export default function TeamAnalysisTable({ teams, onPlayerClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("overall_rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedRef = useRef<HTMLTableRowElement>(null);

  const sorted = [...teams].sort((a, b) => {
    const av = getRankValue(a, sortKey);
    const bv = getRankValue(b, sortKey);
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function toggleExpanded(rosterId: number) {
    setExpandedId(expandedId === rosterId ? null : rosterId);
  }

  // Scroll expanded row into view
  useEffect(() => {
    if (expandedId !== null && expandedRef.current) {
      expandedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expandedId]);

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider sticky left-0 bg-bg-card z-10">
              Team
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">
              Tier
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="px-3 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-center cursor-pointer select-none hover:text-text-secondary transition-colors"
              >
                <span className="relative inline-block">
                  {col.label}
                  <span className={`absolute -right-3 top-0 text-[10px] ${sortKey === col.key ? "text-accent" : "invisible"}`}>
                    {sortKey === col.key && !sortAsc ? "▼" : "▲"}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const isExpanded = expandedId === team.roster_id;
            const avatar = avatarUrl(team.avatar);

            return (
              <Fragment key={team.roster_id}>
                <tr
                  onClick={() => toggleExpanded(team.roster_id)}
                  className={`border-b border-border cursor-pointer transition-colors ${
                    isExpanded ? "bg-bg-hover" : "hover:bg-bg-hover"
                  }`}
                >
                  {/* Team */}
                  <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2.5">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-8 h-8 rounded shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-bg-hover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-text-primary truncate">
                          {team.team_name}
                        </div>
                        <div className="text-xs text-text-secondary truncate">
                          {team.owner_name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="px-3 py-2.5 text-center">
                    <TierBadge
                      label={team.contender_tier}
                      color={team.contender_color}
                      bgColor={team.contender_bg_color}
                    />
                  </td>

                  {/* Rank columns */}
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.overall_rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.starter_rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.positions.QB.rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.positions.RB.rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.positions.WR.rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.positions.TE.rank} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={team.positions.DRAFT.rank} />
                  </td>
                </tr>

                {/* Expanded panel */}
                {isExpanded && (
                  <tr ref={expandedRef}>
                    <td colSpan={9} className="p-0">
                      <div
                        className="overflow-hidden transition-all duration-250 ease-out"
                        style={{ maxHeight: isExpanded ? "2000px" : "0" }}
                      >
                        <ExpandedTeamPanel
                          team={team}
                          totalTeams={teams.length}
                          onPlayerClick={onPlayerClick}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
