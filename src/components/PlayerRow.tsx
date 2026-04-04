"use client";

import Image from "next/image";
import PositionBadge from "./PositionBadge";
import { playerImageUrl } from "@/lib/utils";
import { useState } from "react";

interface PlayerRowProps {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  injury_status: string | null;
  isStarter?: boolean;
  slotLabel?: string;
  onClick?: () => void;
}

export default function PlayerRow({
  player_id,
  full_name,
  position,
  team,
  injury_status,
  isStarter,
  slotLabel,
  onClick,
}: PlayerRowProps) {
  const [imgError, setImgError] = useState(false);
  const isDef = position === "DEF" || /^[A-Z]{2,3}$/.test(player_id);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-bg-hover ${
        isStarter ? "bg-bg-card" : ""
      }`}
    >
      {slotLabel && (
        <span className="text-xs font-medium text-text-muted w-12 shrink-0">
          {slotLabel}
        </span>
      )}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
        {isDef || imgError ? (
          <svg
            className="w-6 h-6 text-text-muted"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
          </svg>
        ) : (
          <Image
            src={playerImageUrl(player_id)}
            alt={full_name}
            width={40}
            height={40}
            className="object-cover w-full h-full"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{full_name}</span>
          {injury_status && (
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                injury_status === "IR" || injury_status === "Out"
                  ? "bg-red-900/40 text-red-400"
                  : injury_status === "Doubtful"
                    ? "bg-orange-900/40 text-orange-400"
                    : "bg-yellow-900/40 text-yellow-400"
              }`}
            >
              {injury_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PositionBadge position={position} />
          {team && (
            <span className="text-xs text-text-muted">{team}</span>
          )}
        </div>
      </div>
    </div>
  );
}
