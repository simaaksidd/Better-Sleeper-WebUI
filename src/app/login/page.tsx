"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Wrong password.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Better Sleeper UI
          </h1>
          <p className="text-text-secondary text-sm">
            Enter the password to continue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-lg p-6"
        >
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            autoFocus
            disabled={loading}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
