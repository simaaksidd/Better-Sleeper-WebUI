import { getRankBadgeColor } from "@/lib/power-rankings";

export default function RankBadge({ rank }: { rank: number }) {
  const bg = getRankBadgeColor(rank);

  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {rank}
    </span>
  );
}
