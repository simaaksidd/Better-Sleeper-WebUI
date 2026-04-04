"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeagueContext } from "@/context/LeagueContext";

const links = [
  { href: "/", label: "My Team" },
  { href: "/teams", label: "All Teams" },
  { href: "/trades", label: "Trades" },
  { href: "/history", label: "History" },
  { href: "/rookies", label: "Rookies" },
];

export default function Nav() {
  const pathname = usePathname();
  const { league, syncing, syncProgress, triggerSync } = useLeagueContext();

  return (
    <nav className="border-b border-border bg-bg-card sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-text-primary">
            {league?.name || "Sleeper League"}
          </span>
          <div className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className={`w-[120px] py-1.5 text-sm rounded border border-border transition-colors ${
            syncing
              ? "disabled:opacity-100"
              : "bg-bg-hover text-text-secondary hover:text-text-primary hover:border-text-muted disabled:opacity-50"
          }`}
          style={
            syncing
              ? {
                  background: `linear-gradient(to right, var(--color-accent) ${syncProgress}%, var(--color-bg-hover) ${syncProgress}%)`,
                  color: syncProgress > 50 ? "white" : undefined,
                }
              : undefined
          }
        >
          {syncing ? `Syncing ${syncProgress}%` : "Refresh Data"}
        </button>
      </div>
    </nav>
  );
}
