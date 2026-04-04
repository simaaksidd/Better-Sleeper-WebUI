"use client";

import type { StatRow } from "@/hooks/usePlayerStats";

interface GameLogTableProps {
  stats: StatRow[];
  position: string;
}

interface Column {
  key: string;
  label: string;
  getValue: (s: StatRow) => string | number;
  group: string;
}

function getColumns(position: string): Column[] {
  const gameInfo: Column[] = [
    { key: "wk", label: "WK", getValue: (s) => s.week, group: "Game" },
    {
      key: "opp",
      label: "OPP",
      getValue: (s) => s.opponent_team || "-",
      group: "Game",
    },
  ];

  const fantasy: Column[] = [
    {
      key: "fpts",
      label: "FPTS",
      getValue: (s) => s.fantasy_points_ppr?.toFixed(1) ?? "0.0",
      group: "Fantasy",
    },
  ];

  const fumble: Column[] = [
    {
      key: "fum",
      label: "FUM",
      getValue: (s) =>
        (s.rushing_fumbles || 0) +
        (s.receiving_fumbles || 0) +
        (s.sack_fumbles || 0),
      group: "Fumble",
    },
    {
      key: "fum_lost",
      label: "LOST",
      getValue: (s) =>
        (s.rushing_fumbles_lost || 0) +
        (s.receiving_fumbles_lost || 0) +
        (s.sack_fumbles_lost || 0),
      group: "Fumble",
    },
  ];

  switch (position) {
    case "QB":
      return [
        ...gameInfo,
        ...fantasy,
        {
          key: "pass_att",
          label: "ATT",
          getValue: (s) => s.attempts || 0,
          group: "Passing",
        },
        {
          key: "cmp",
          label: "CMP",
          getValue: (s) => s.completions || 0,
          group: "Passing",
        },
        {
          key: "pass_yd",
          label: "YD",
          getValue: (s) => s.passing_yards || 0,
          group: "Passing",
        },
        {
          key: "pass_td",
          label: "TD",
          getValue: (s) => s.passing_tds || 0,
          group: "Passing",
        },
        {
          key: "int",
          label: "INT",
          getValue: (s) => s.passing_interceptions || 0,
          group: "Passing",
        },
        {
          key: "rush_att",
          label: "ATT",
          getValue: (s) => s.carries || 0,
          group: "Rushing",
        },
        {
          key: "rush_yd",
          label: "YD",
          getValue: (s) => s.rushing_yards || 0,
          group: "Rushing",
        },
        {
          key: "rush_ypc",
          label: "YPC",
          getValue: (s) =>
            s.carries ? (s.rushing_yards / s.carries).toFixed(1) : "-",
          group: "Rushing",
        },
        {
          key: "rush_td",
          label: "TD",
          getValue: (s) => s.rushing_tds || 0,
          group: "Rushing",
        },
        {
          key: "sk",
          label: "SK",
          getValue: (s) => s.sacks_suffered || 0,
          group: "Sacked",
        },
        {
          key: "sk_yd",
          label: "YDS",
          getValue: (s) => s.sack_yards_lost || 0,
          group: "Sacked",
        },
        ...fumble,
      ];

    case "RB":
      return [
        ...gameInfo,
        ...fantasy,
        {
          key: "rush_att",
          label: "ATT",
          getValue: (s) => s.carries || 0,
          group: "Rushing",
        },
        {
          key: "rush_yd",
          label: "YD",
          getValue: (s) => s.rushing_yards || 0,
          group: "Rushing",
        },
        {
          key: "rush_ypc",
          label: "YPC",
          getValue: (s) =>
            s.carries ? (s.rushing_yards / s.carries).toFixed(1) : "-",
          group: "Rushing",
        },
        {
          key: "rush_td",
          label: "TD",
          getValue: (s) => s.rushing_tds || 0,
          group: "Rushing",
        },
        {
          key: "tgt",
          label: "TGT",
          getValue: (s) => s.targets || 0,
          group: "Receiving",
        },
        {
          key: "rec",
          label: "REC",
          getValue: (s) => s.receptions || 0,
          group: "Receiving",
        },
        {
          key: "rec_yd",
          label: "YD",
          getValue: (s) => s.receiving_yards || 0,
          group: "Receiving",
        },
        {
          key: "rec_td",
          label: "TD",
          getValue: (s) => s.receiving_tds || 0,
          group: "Receiving",
        },
        ...fumble,
      ];

    case "K":
      return [
        ...gameInfo,
        ...fantasy,
        {
          key: "fga",
          label: "FGA",
          getValue: (s) => s.fg_att || 0,
          group: "FG",
        },
        {
          key: "fgm",
          label: "FGM",
          getValue: (s) => s.fg_made || 0,
          group: "FG",
        },
        {
          key: "fg_pct",
          label: "FG%",
          getValue: (s) =>
            s.fg_att
              ? ((s.fg_made / s.fg_att) * 100).toFixed(0) + "%"
              : "-",
          group: "FG",
        },
        {
          key: "xpa",
          label: "XPA",
          getValue: (s) => s.pat_att || 0,
          group: "XP",
        },
        {
          key: "xpm",
          label: "XPM",
          getValue: (s) => s.pat_made || 0,
          group: "XP",
        },
      ];

    // WR / TE / default
    default:
      return [
        ...gameInfo,
        ...fantasy,
        {
          key: "tgt",
          label: "TGT",
          getValue: (s) => s.targets || 0,
          group: "Receiving",
        },
        {
          key: "rec",
          label: "REC",
          getValue: (s) => s.receptions || 0,
          group: "Receiving",
        },
        {
          key: "rec_yd",
          label: "YD",
          getValue: (s) => s.receiving_yards || 0,
          group: "Receiving",
        },
        {
          key: "rec_td",
          label: "TD",
          getValue: (s) => s.receiving_tds || 0,
          group: "Receiving",
        },
        {
          key: "rush_att",
          label: "ATT",
          getValue: (s) => s.carries || 0,
          group: "Rushing",
        },
        {
          key: "rush_yd",
          label: "YD",
          getValue: (s) => s.rushing_yards || 0,
          group: "Rushing",
        },
        {
          key: "rush_td",
          label: "TD",
          getValue: (s) => s.rushing_tds || 0,
          group: "Rushing",
        },
        ...fumble,
      ];
  }
}

function computeTotals(stats: StatRow[], columns: Column[]): Record<string, string | number> {
  const totals: Record<string, string | number> = {};
  for (const col of columns) {
    if (col.key === "wk") {
      totals[col.key] = "TOT";
    } else if (col.key === "opp") {
      totals[col.key] = "";
    } else if (col.key === "rush_ypc") {
      const totalCarries = stats.reduce((a, s) => a + (s.carries || 0), 0);
      const totalYards = stats.reduce((a, s) => a + (s.rushing_yards || 0), 0);
      totals[col.key] = totalCarries
        ? (totalYards / totalCarries).toFixed(1)
        : "-";
    } else if (col.key === "fg_pct") {
      const totalAtt = stats.reduce((a, s) => a + (s.fg_att || 0), 0);
      const totalMade = stats.reduce((a, s) => a + (s.fg_made || 0), 0);
      totals[col.key] = totalAtt
        ? ((totalMade / totalAtt) * 100).toFixed(0) + "%"
        : "-";
    } else if (col.key === "fpts") {
      totals[col.key] = stats
        .reduce((a, s) => a + (s.fantasy_points_ppr || 0), 0)
        .toFixed(1);
    } else {
      const sum = stats.reduce((a, s) => {
        const v = col.getValue(s);
        return a + (typeof v === "number" ? v : 0);
      }, 0);
      totals[col.key] = sum;
    }
  }
  return totals;
}

// 18 regular season + 4 postseason (Wild Card, Divisional, Conf Championship, Super Bowl)
const ALL_WEEKS = Array.from({ length: 22 }, (_, i) => i + 1);

export default function GameLogTable({ stats, position }: GameLogTableProps) {
  const columns = getColumns(position);
  const totals = computeTotals(stats, columns);

  // Index stats by week for O(1) lookup
  const statsByWeek = new Map<number, StatRow>();
  for (const s of stats) {
    statsByWeek.set(s.week, s);
  }

  // Group headers
  const groups: { name: string; span: number }[] = [];
  let lastGroup = "";
  for (const col of columns) {
    if (col.group !== lastGroup) {
      groups.push({ name: col.group, span: 1 });
      lastGroup = col.group;
    } else {
      groups[groups.length - 1].span++;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {groups.map((g, i) => (
              <th
                key={i}
                colSpan={g.span}
                className="text-xs text-text-muted font-normal px-2 pt-2 pb-0 text-center border-b border-border"
              >
                {g.name}
              </th>
            ))}
          </tr>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-2 py-1.5 text-xs font-semibold text-text-secondary text-right whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_WEEKS.map((week, i) => {
            const s = statsByWeek.get(week);
            const isPost = week > 18;
            return (
              <tr
                key={week}
                className={`border-b border-border ${
                  i % 2 === 0 ? "bg-bg-card" : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2 py-1.5 text-right whitespace-nowrap ${
                      !s ? "text-text-muted" : ""
                    }`}
                  >
                    {c.key === "wk"
                      ? isPost
                        ? `P${week - 18}`
                        : week
                      : s
                        ? c.getValue(s)
                        : "-"}
                  </td>
                ))}
              </tr>
            );
          })}
          {/* Totals row */}
          <tr className="border-t-2 border-accent font-semibold bg-bg-hover">
            {columns.map((c) => (
              <td
                key={c.key}
                className="px-2 py-1.5 text-right whitespace-nowrap"
              >
                {totals[c.key]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
