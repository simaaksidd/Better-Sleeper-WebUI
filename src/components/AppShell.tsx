"use client";

import { ReactNode } from "react";
import { useLeagueContext } from "@/context/LeagueContext";
import Nav from "@/components/Nav";
import WelcomeScreen from "@/components/WelcomeScreen";

export default function AppShell({ children }: { children: ReactNode }) {
  const { leagueId, hydrated } = useLeagueContext();

  // Don't render until localStorage has been read to avoid hydration mismatch
  if (!hydrated) return null;

  if (!leagueId) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </>
  );
}
