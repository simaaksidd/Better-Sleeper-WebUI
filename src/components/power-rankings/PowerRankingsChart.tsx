"use client";

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import type { PRTeam } from "@/lib/types";
import PowerRankingsTooltip from "./PowerRankingsTooltip";

const SEGMENTS = [
  { key: "QB", color: CHART_COLORS.QB },
  { key: "RB", color: CHART_COLORS.RB },
  { key: "WR", color: CHART_COLORS.WR },
  { key: "TE", color: CHART_COLORS.TE },
  { key: "DRAFT", color: CHART_COLORS.DRAFT },
] as const;

/** Darken a hex color by a factor (0-1, where 0.8 = 80% brightness) */
function darken(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface ChartRow {
  name: string;
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  DRAFT: number;
}

export default function PowerRankingsChart({ teams }: { teams: PRTeam[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const sorted = [...teams].sort((a, b) => b.overall_value - a.overall_value);

  const data: ChartRow[] = sorted.map((t) => ({
    name: t.owner_name,
    QB: t.positions.QB.value,
    RB: t.positions.RB.value,
    WR: t.positions.WR.value,
    TE: t.positions.TE.value,
    DRAFT: t.positions.DRAFT.value,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state: any) => {
    if (state?.isTooltipActive && typeof state.activeTooltipIndex === "number") {
      setActiveIndex(state.activeTooltipIndex);
    } else {
      setActiveIndex(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const renderLegend = () => (
    <div className="flex justify-end gap-4 mb-2 text-xs text-text-secondary">
      {SEGMENTS.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.key === "DRAFT" ? "Draft" : s.key}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(teams.length * 80, 500) }}>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                content={<PowerRankingsTooltip />}
                cursor={false}
              />
              <Legend content={renderLegend} />
              {SEGMENTS.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="value"
                  fill={s.color}
                  radius={
                    s.key === "DRAFT"
                      ? [4, 4, 0, 0]
                      : undefined
                  }
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={activeIndex === i ? darken(s.color, 0.7) : s.color}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
