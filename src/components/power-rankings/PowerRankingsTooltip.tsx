import { CHART_COLORS } from "@/lib/constants";

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface Props {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const LABEL_MAP: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  DRAFT: "Draft",
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function PowerRankingsTooltip({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-bg-card border border-border rounded-lg px-4 py-3 shadow-sm text-sm">
      <div className="font-bold text-text-primary mb-2">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-6 py-0.5">
          <span style={{ color: CHART_COLORS[entry.dataKey] || entry.color }}>
            {LABEL_MAP[entry.dataKey] || entry.dataKey}
          </span>
          <span className="font-mono text-text-primary">{fmt(entry.value || 0)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between gap-6 font-bold">
        <span className="text-text-primary">Total</span>
        <span className="font-mono text-text-primary">{fmt(total)}</span>
      </div>
    </div>
  );
}
