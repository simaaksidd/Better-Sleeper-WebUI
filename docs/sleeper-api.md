---
paths:
  - "src/lib/sleeper-api.ts"
  - "src/lib/sync.ts"
  - "src/app/api/**/*.ts"
---

# Sleeper API Rules

- Official API base: `https://api.sleeper.app/v1/` — used for league, rosters, users, transactions, drafts, players, nfl state.
- Undocumented stats base: `https://api.sleeper.com/` — NO `/v1/` prefix. ONLY used as fallback when nflverse stats are missing.
- **Never mix these two base URLs.** Using `/v1/` with `api.sleeper.com` or omitting it with `api.sleeper.app` will 404.
- The `/players/nfl` endpoint returns ~5MB. Fetch at most once per day during sync. Never call from client.
- Transactions must be fetched per-week (loop weeks 1-18). There is no "get all transactions" endpoint.
- `roster.owner_id` maps to `user.user_id`. roster_id ≠ user_id — always join through these fields.
- Fantasy points: `fpts + (fpts_decimal / 100)`. Same for `fpts_against`.
- DEF player IDs are team abbreviations like `"DET"` not numeric.
- Stay under 1000 API calls/min. A full sync is ~22 calls. Add 50ms delay in transaction loop.
- All Sleeper fetches are server-side only. Never import sleeper-api.ts in client components.
- Full endpoint reference: see `docs/sleeper-api.md`
