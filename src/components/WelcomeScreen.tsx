"use client";

import { useState } from "react";
import { useLeagueContext } from "@/context/LeagueContext";

export default function WelcomeScreen() {
  const { setLeagueId, triggerSync } = useLeagueContext();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!/^\d{10,}$/.test(trimmed)) {
      setError("League ID should be a numeric value (at least 10 digits).");
      return;
    }
    setError("");
    setLeagueId(trimmed);
    triggerSync(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Better Sleeper UI
          </h1>
          <p className="text-text-secondary">
            A better dashboard for your Sleeper fantasy football league.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-lg p-6"
        >
          <label
            htmlFor="leagueId"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Sleeper League ID
          </label>
          <input
            id="leagueId"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. 1313770370750230528"
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded transition-colors"
          >
            Load League
          </button>
          <p className="mt-3 text-xs text-text-muted text-center">
            Find your league ID in the Sleeper app under League Settings.
          </p>
        </form>
      </div>
    </div>
  );
}
