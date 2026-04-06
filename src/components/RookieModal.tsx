"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { POSITION_COLORS } from "@/lib/constants";
import PositionBadge from "./PositionBadge";
import SeasonSelector from "./SeasonSelector";

interface RookieModalProps {
  playerId: string;
  playerName: string;
  position: string;
  onClose: () => void;
}

interface RookieData {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  espn_college_id: string | null;
  headshot_url: string | null;
  combine: {
    forty: number | null;
    vertical: number | null;
    bench: number | null;
    broad_jump: number | null;
    cone: number | null;
    shuttle: number | null;
    draft_team: string | null;
    draft_round: number | null;
    draft_ovr: number | null;
  } | null;
  college_seasons: CollegeSeason[];
  draft: {
    round: number;
    pick_no: number;
    team?: string;
  } | null;
}

interface CollegeSeason {
  season: number;
  games_played: number;
  completions: number;
  attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  carries: number;
  rushing_yards: number;
  rushing_tds: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  fumbles_lost: number;
  sacks: number;
  tackles_total: number;
  tackles_for_loss: number;
  pass_defended: number;
  def_interceptions: number;
}

interface CollegeGame {
  week: number;
  game_date: string | null;
  opponent: string | null;
  result: string | null;
  completions: number;
  attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  carries: number;
  rushing_yards: number;
  rushing_tds: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  fumbles_lost: number;
  sacks: number;
  tackles_total: number;
  tackles_for_loss: number;
  pass_defended: number;
  def_interceptions: number;
}

interface NewsItem {
  headline: string;
  description: string;
  published: string;
  url: string | null;
  source?: string;
}

export default function RookieModal({
  playerId,
  playerName,
  position,
  onClose,
}: RookieModalProps) {
  const [data, setData] = useState<RookieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsSources, setNewsSources] = useState<string[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Game log state
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [gameLogs, setGameLogs] = useState<Record<number, CollegeGame[]>>({});
  const [gameLogLoading, setGameLogLoading] = useState<number | null>(null);

  // Fetch rookie data
  useEffect(() => {
    fetch(`/api/rookies/${playerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setData(d);
          // Default to most recent season
          if (d.college_seasons?.length > 0) {
            setSelectedSeason(d.college_seasons[0].season);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

  // Fetch college news
  useEffect(() => {
    fetch(`/api/rookies/${playerId}/news`)
      .then((r) => (r.ok ? r.json() : { news: [], sources: [] }))
      .then((d) => {
        setNews(d.news || []);
        setNewsSources(d.sources || []);
      })
      .catch(() => {
        setNews([]);
        setNewsSources([]);
      })
      .finally(() => setNewsLoading(false));
  }, [playerId]);

  // Lazy fetch game logs when season is clicked
  const fetchGameLog = useCallback(
    (season: number) => {
      if (gameLogs[season] || gameLogLoading === season) return;
      setGameLogLoading(season);
      fetch(`/api/rookies/${playerId}/gamelog?season=${season}`)
        .then((r) => (r.ok ? r.json() : { games: [] }))
        .then((d) => {
          setGameLogs((prev) => ({ ...prev, [season]: d.games || [] }));
        })
        .catch(() => {
          setGameLogs((prev) => ({ ...prev, [season]: [] }));
        })
        .finally(() => setGameLogLoading(null));
    },
    [playerId, gameLogs, gameLogLoading]
  );

  const handleSeasonClick = (season: number) => {
    setSelectedSeason(season);
    fetchGameLog(season);
  };

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

  const posColor = POSITION_COLORS[position] || "#888";

  // For rookies: ESPN college headshot → silhouette (skip sleepercdn which 403s)
  const headshotSrc = data?.headshot_url || null;

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
          {/* Headshot */}
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
            {imgError || !headshotSrc ? (
              <svg
                className="w-10 h-10 text-text-muted"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            ) : (
              <Image
                src={headshotSrc}
                alt={playerName}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold truncate">{playerName}</h2>
              <button
                onClick={onClose}
                className="ml-auto text-text-muted hover:text-text-primary text-2xl leading-none shrink-0"
              >
                x
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <PositionBadge position={position} />
              {data?.college && (
                <span className="text-sm font-semibold text-text-secondary">
                  {data.college}
                </span>
              )}
              {data?.team && (
                <span className="text-sm text-text-muted">
                  {data.team}
                </span>
              )}
              {data?.draft && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent/20 text-accent">
                  Rd {data.draft.round}, Pick {data.draft.pick_no}
                  {data.draft.team && ` — ${data.draft.team}`}
                </span>
              )}
            </div>

            {/* Bio stats row */}
            {data && !loading && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2">
                {data.age != null && (
                  <BioStat label="AGE" value={String(data.age)} />
                )}
                {data.height && <BioStat label="HEIGHT" value={data.height} />}
                {data.weight && (
                  <BioStat label="WEIGHT" value={`${data.weight} lbs`} />
                )}
                {data.college && (
                  <BioStat label="COLLEGE" value={data.college} />
                )}
              </div>
            )}

            {/* Combine metrics row */}
            {data?.combine && <CombineRow combine={data.combine} />}
          </div>
        </div>

        {/* ── Body: two-column layout ── */}
        <div className="flex flex-1 min-h-0">
          {/* Left: College Stats (~65%) */}
          <div className="flex-[65] border-r border-border overflow-y-auto p-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              College Game Logs
            </h3>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 bg-bg-card rounded animate-pulse"
                  />
                ))}
              </div>
            ) : data?.college_seasons && data.college_seasons.length > 0 ? (
              <>
                <div className="mb-4">
                  <SeasonSelector
                    seasons={data.college_seasons.map((s) => s.season)}
                    selected={selectedSeason || data.college_seasons[0].season}
                    onSelect={handleSeasonClick}
                  />
                </div>

                {/* Season totals table (always visible) */}
                <CollegeSeasonTable
                  seasons={data.college_seasons}
                  position={position}
                  selectedSeason={selectedSeason}
                />

                {/* Per-game drill-down */}
                {selectedSeason && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      {selectedSeason} Game-by-Game
                    </h4>
                    {gameLogLoading === selectedSeason ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-8 bg-bg-card rounded animate-pulse"
                          />
                        ))}
                      </div>
                    ) : gameLogs[selectedSeason] &&
                      gameLogs[selectedSeason].length > 0 ? (
                      <CollegeGameLogTable
                        games={gameLogs[selectedSeason]}
                        position={position}
                      />
                    ) : gameLogs[selectedSeason] ? (
                      <p className="text-sm text-text-muted">
                        Game details unavailable
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Career totals */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Career Totals
                  </h4>
                  <CareerTotals
                    seasons={data.college_seasons}
                    position={position}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No college stats available
              </p>
            )}
          </div>

          {/* Right: Sidebar (~35%) */}
          <div className="flex-[35] flex flex-col min-h-0">
            {/* College News */}
            <div className="flex-1 overflow-y-auto p-4 border-b border-border">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                College News
              </h3>
              <NewsSection news={news} sources={newsSources} loading={newsLoading} />
            </div>

            {/* Depth Chart / Draft Status */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Draft Status
              </h3>
              {data?.draft ? (
                <div className="text-sm">
                  <span className="font-semibold">
                    Round {data.draft.round}, Pick {data.draft.pick_no}
                  </span>
                  {data.draft.team && (
                    <span className="text-text-secondary ml-1">
                      — {data.draft.team}
                    </span>
                  )}
                </div>
              ) : data?.team ? (
                <p className="text-sm text-text-secondary">
                  Signed with {data.team}
                </p>
              ) : (
                <p className="text-sm text-text-muted">
                  Not yet on an NFL roster
                </p>
              )}
            </div>
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

function CombineRow({
  combine,
}: {
  combine: NonNullable<RookieData["combine"]>;
}) {
  const metrics: { label: string; value: string }[] = [];
  if (combine.forty) metrics.push({ label: "40-YD", value: `${combine.forty}s` });
  if (combine.vertical)
    metrics.push({ label: "VERTICAL", value: `${combine.vertical}"` });
  if (combine.bench)
    metrics.push({ label: "BENCH", value: `${combine.bench} reps` });
  if (combine.broad_jump)
    metrics.push({ label: "BROAD JUMP", value: `${combine.broad_jump}"` });
  if (combine.cone) metrics.push({ label: "3-CONE", value: `${combine.cone}s` });
  if (combine.shuttle)
    metrics.push({ label: "SHUTTLE", value: `${combine.shuttle}s` });

  if (metrics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 pt-2 border-t border-border/50">
      {metrics.map((m) => (
        <BioStat key={m.label} label={m.label} value={m.value} />
      ))}
    </div>
  );
}

// ── College Season Totals Table ──

interface ColCol {
  key: string;
  label: string;
  getValue: (s: CollegeSeason) => string | number;
  group: string;
}

function getCollegeColumns(position: string): ColCol[] {
  const info: ColCol[] = [
    { key: "yr", label: "YEAR", getValue: (s) => s.season, group: "Season" },
    { key: "gp", label: "GP", getValue: (s) => s.games_played, group: "Season" },
  ];

  switch (position) {
    case "QB":
      return [
        ...info,
        { key: "cmp", label: "CMP", getValue: (s) => s.completions, group: "Passing" },
        { key: "att", label: "ATT", getValue: (s) => s.attempts, group: "Passing" },
        { key: "pyd", label: "YDS", getValue: (s) => s.passing_yards, group: "Passing" },
        { key: "ptd", label: "TD", getValue: (s) => s.passing_tds, group: "Passing" },
        { key: "int", label: "INT", getValue: (s) => s.interceptions, group: "Passing" },
        { key: "car", label: "CAR", getValue: (s) => s.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (s) => s.rushing_yards, group: "Rushing" },
        { key: "rtd", label: "TD", getValue: (s) => s.rushing_tds, group: "Rushing" },
      ];
    case "RB":
      return [
        ...info,
        { key: "car", label: "CAR", getValue: (s) => s.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (s) => s.rushing_yards, group: "Rushing" },
        {
          key: "rypc",
          label: "YPC",
          getValue: (s) => s.carries ? (s.rushing_yards / s.carries).toFixed(1) : "-",
          group: "Rushing",
        },
        { key: "rtd", label: "TD", getValue: (s) => s.rushing_tds, group: "Rushing" },
        { key: "rec", label: "REC", getValue: (s) => s.receptions, group: "Receiving" },
        { key: "reyd", label: "YDS", getValue: (s) => s.receiving_yards, group: "Receiving" },
        { key: "retd", label: "TD", getValue: (s) => s.receiving_tds, group: "Receiving" },
      ];
    case "WR":
    case "TE":
      return [
        ...info,
        { key: "rec", label: "REC", getValue: (s) => s.receptions, group: "Receiving" },
        { key: "reyd", label: "YDS", getValue: (s) => s.receiving_yards, group: "Receiving" },
        { key: "retd", label: "TD", getValue: (s) => s.receiving_tds, group: "Receiving" },
        { key: "car", label: "CAR", getValue: (s) => s.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (s) => s.rushing_yards, group: "Rushing" },
        { key: "rtd", label: "TD", getValue: (s) => s.rushing_tds, group: "Rushing" },
      ];
    default:
      return [
        ...info,
        { key: "tkl", label: "TKL", getValue: (s) => s.tackles_total, group: "Defense" },
        { key: "tfl", label: "TFL", getValue: (s) => s.tackles_for_loss, group: "Defense" },
        { key: "sck", label: "SACK", getValue: (s) => s.sacks, group: "Defense" },
        { key: "pd", label: "PD", getValue: (s) => s.pass_defended, group: "Defense" },
        { key: "dint", label: "INT", getValue: (s) => s.def_interceptions, group: "Defense" },
      ];
  }
}

function CollegeSeasonTable({
  seasons,
  position,
  selectedSeason,
}: {
  seasons: CollegeSeason[];
  position: string;
  selectedSeason: number | null;
}) {
  const columns = getCollegeColumns(position);
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
          {seasons.map((s, i) => (
            <tr
              key={s.season}
              className={`border-b border-border ${
                s.season === selectedSeason
                  ? "bg-accent/10"
                  : i % 2 === 0
                    ? "bg-bg-card"
                    : ""
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-1.5 text-right whitespace-nowrap"
                >
                  {c.getValue(s)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── College Game Log Table ──

interface GameCol {
  key: string;
  label: string;
  getValue: (g: CollegeGame) => string | number;
  group: string;
}

function getGameColumns(position: string): GameCol[] {
  const info: GameCol[] = [
    { key: "wk", label: "WK", getValue: (g) => g.week, group: "Game" },
    { key: "opp", label: "OPP", getValue: (g) => g.opponent || "-", group: "Game" },
    {
      key: "res",
      label: "RES",
      getValue: (g) => g.result || "-",
      group: "Game",
    },
  ];

  switch (position) {
    case "QB":
      return [
        ...info,
        { key: "cmp", label: "CMP", getValue: (g) => g.completions, group: "Passing" },
        { key: "att", label: "ATT", getValue: (g) => g.attempts, group: "Passing" },
        { key: "pyd", label: "YDS", getValue: (g) => g.passing_yards, group: "Passing" },
        { key: "ptd", label: "TD", getValue: (g) => g.passing_tds, group: "Passing" },
        { key: "int", label: "INT", getValue: (g) => g.interceptions, group: "Passing" },
        { key: "car", label: "CAR", getValue: (g) => g.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (g) => g.rushing_yards, group: "Rushing" },
        { key: "rtd", label: "TD", getValue: (g) => g.rushing_tds, group: "Rushing" },
      ];
    case "RB":
      return [
        ...info,
        { key: "car", label: "CAR", getValue: (g) => g.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (g) => g.rushing_yards, group: "Rushing" },
        {
          key: "rypc",
          label: "YPC",
          getValue: (g) => g.carries ? (g.rushing_yards / g.carries).toFixed(1) : "-",
          group: "Rushing",
        },
        { key: "rtd", label: "TD", getValue: (g) => g.rushing_tds, group: "Rushing" },
        { key: "rec", label: "REC", getValue: (g) => g.receptions, group: "Receiving" },
        { key: "reyd", label: "YDS", getValue: (g) => g.receiving_yards, group: "Receiving" },
        { key: "retd", label: "TD", getValue: (g) => g.receiving_tds, group: "Receiving" },
      ];
    case "WR":
    case "TE":
      return [
        ...info,
        { key: "rec", label: "REC", getValue: (g) => g.receptions, group: "Receiving" },
        { key: "reyd", label: "YDS", getValue: (g) => g.receiving_yards, group: "Receiving" },
        { key: "retd", label: "TD", getValue: (g) => g.receiving_tds, group: "Receiving" },
        { key: "car", label: "CAR", getValue: (g) => g.carries, group: "Rushing" },
        { key: "ryd", label: "YDS", getValue: (g) => g.rushing_yards, group: "Rushing" },
        { key: "rtd", label: "TD", getValue: (g) => g.rushing_tds, group: "Rushing" },
      ];
    default:
      return [
        ...info,
        { key: "tkl", label: "TKL", getValue: (g) => g.tackles_total, group: "Defense" },
        { key: "tfl", label: "TFL", getValue: (g) => g.tackles_for_loss, group: "Defense" },
        { key: "sck", label: "SACK", getValue: (g) => g.sacks, group: "Defense" },
        { key: "pd", label: "PD", getValue: (g) => g.pass_defended, group: "Defense" },
        { key: "dint", label: "INT", getValue: (g) => g.def_interceptions, group: "Defense" },
      ];
  }
}

function CollegeGameLogTable({
  games,
  position,
}: {
  games: CollegeGame[];
  position: string;
}) {
  const columns = getGameColumns(position);
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
          {games.map((g, i) => (
            <tr
              key={i}
              className={`border-b border-border ${
                i % 2 === 0 ? "bg-bg-card" : ""
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-1.5 text-right whitespace-nowrap"
                >
                  {c.getValue(g)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Career Totals ──

function CareerTotals({
  seasons,
  position,
}: {
  seasons: CollegeSeason[];
  position: string;
}) {
  const totals: CollegeSeason = {
    season: 0,
    games_played: seasons.reduce((a, s) => a + s.games_played, 0),
    completions: seasons.reduce((a, s) => a + s.completions, 0),
    attempts: seasons.reduce((a, s) => a + s.attempts, 0),
    passing_yards: seasons.reduce((a, s) => a + s.passing_yards, 0),
    passing_tds: seasons.reduce((a, s) => a + s.passing_tds, 0),
    interceptions: seasons.reduce((a, s) => a + s.interceptions, 0),
    carries: seasons.reduce((a, s) => a + s.carries, 0),
    rushing_yards: seasons.reduce((a, s) => a + s.rushing_yards, 0),
    rushing_tds: seasons.reduce((a, s) => a + s.rushing_tds, 0),
    receptions: seasons.reduce((a, s) => a + s.receptions, 0),
    receiving_yards: seasons.reduce((a, s) => a + s.receiving_yards, 0),
    receiving_tds: seasons.reduce((a, s) => a + s.receiving_tds, 0),
    fumbles_lost: seasons.reduce((a, s) => a + s.fumbles_lost, 0),
    sacks: seasons.reduce((a, s) => a + s.sacks, 0),
    tackles_total: seasons.reduce((a, s) => a + s.tackles_total, 0),
    tackles_for_loss: seasons.reduce((a, s) => a + s.tackles_for_loss, 0),
    pass_defended: seasons.reduce((a, s) => a + s.pass_defended, 0),
    def_interceptions: seasons.reduce((a, s) => a + s.def_interceptions, 0),
  };

  const columns = getCollegeColumns(position);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-t-2 border-accent font-semibold bg-bg-hover">
            {columns.map((c) => (
              <td
                key={c.key}
                className="px-2 py-1.5 text-right whitespace-nowrap"
              >
                {c.key === "yr" ? "CAREER" : c.key === "gp" ? totals.games_played : c.getValue(totals)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── News Section ──

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
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return <p className="text-sm text-text-muted">No recent news</p>;
  }

  return (
    <div className="space-y-4">
      {sources && sources.length > 0 && (
        <p className="text-[10px] text-text-muted -mt-1">
          via {sources.join(", ")}
        </p>
      )}
      {news.map((item, i) => (
        <article
          key={i}
          className={i > 0 ? "pt-4 border-t border-border" : ""}
        >
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
