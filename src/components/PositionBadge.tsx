import { POSITION_COLORS } from "@/lib/constants";

export default function PositionBadge({ position }: { position: string }) {
  const color = POSITION_COLORS[position] || "#6b7280";

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-bold"
      style={{ backgroundColor: color + "22", color }}
    >
      {position}
    </span>
  );
}
