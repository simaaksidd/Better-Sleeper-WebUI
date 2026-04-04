"use client";

interface SeasonSelectorProps {
  seasons: number[];
  selected: number;
  onSelect: (season: number) => void;
}

export default function SeasonSelector({
  seasons,
  selected,
  onSelect,
}: SeasonSelectorProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {seasons.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap transition-colors ${
            s === selected
              ? "bg-accent text-white"
              : "bg-bg-hover text-text-secondary hover:text-text-primary"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
