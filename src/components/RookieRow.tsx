"use client";

import Image from "next/image";
import { playerImageUrl } from "@/lib/utils";
import PositionBadge from "./PositionBadge";
import { useState } from "react";

interface RookieRowProps {
  pick_no: number;
  round: number;
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  college: string | null;
  display_name: string;
  onClick?: () => void;
}

export default function RookieRow({
  pick_no,
  round,
  player_id,
  full_name,
  position,
  team,
  college,
  display_name,
  onClick,
}: RookieRowProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-bg-hover"
    >
      <span className="text-sm font-mono text-text-muted w-12 shrink-0">
        {round}.{String(((pick_no - 1) % 12) + 1).padStart(2, "0")}
      </span>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-hover shrink-0 flex items-center justify-center">
        {imgError ? (
          <svg
            className="w-6 h-6 text-text-muted"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
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
          <PositionBadge position={position || "Unknown"} />
        </div>
        <div className="text-xs text-text-muted">
          {team && <span>{team}</span>}
          {college && <span> | {college}</span>}
        </div>
      </div>
      <span className="text-xs text-text-secondary shrink-0">
        {display_name}
      </span>
    </div>
  );
}
