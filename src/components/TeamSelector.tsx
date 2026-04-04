"use client";

import { useLeagueContext } from "@/context/LeagueContext";
import { useRosters } from "@/hooks/useRosters";

export default function TeamSelector() {
  const { myRosterId, setMyRosterId } = useLeagueContext();
  const { rosters } = useRosters();

  if (rosters.length === 0) return null;

  return (
    <select
      value={myRosterId ?? ""}
      onChange={(e) => setMyRosterId(parseInt(e.target.value))}
      className="bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
    >
      <option value="" disabled>
        Set as My Team
      </option>
      {rosters.map((r) => (
        <option key={r.roster_id} value={r.roster_id}>
          {r.display_name}
        </option>
      ))}
    </select>
  );
}
