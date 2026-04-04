# File Structure

```
├── data/
│   └── sleeper.db              # SQLite database (gitignored, auto-created on first run)
├── docs/
│   ├── sleeper-api.md          # Full Sleeper API endpoint reference
│   ├── nflverse-stats.md       # nflverse CSV reference, column names, stat mapping
│   └── player-modal.md         # Player detail modal spec with position-specific columns
├── .claude/
│   ├── CLAUDE.md               # (optional, can also be root CLAUDE.md)
│   └── rules/
│       ├── sleeper-api.md      # Rules for Sleeper API usage
│       ├── nflverse.md         # Rules for nflverse data handling
│       └── ui-design.md        # Design rules (dark theme, position colors)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with nav + league context provider
│   │   ├── page.tsx                # My Team (home)
│   │   ├── teams/
│   │   │   └── page.tsx            # All Teams
│   │   ├── trades/
│   │   │   └── page.tsx            # Trades
│   │   ├── rookies/
│   │   │   └── page.tsx            # Rookies
│   │   └── api/
│   │       ├── sync/route.ts       # POST: trigger full sync. GET: check status.
│   │       ├── league/route.ts     # GET: league info + scoring settings
│   │       ├── rosters/route.ts    # GET: all rosters with player + user data joined
│   │       ├── trades/route.ts     # GET: all trades, fully resolved
│   │       ├── drafts/route.ts     # GET: draft picks
│   │       ├── rookies/route.ts    # GET: rookie-class players
│   │       └── players/
│   │           └── [id]/
│   │               ├── route.ts        # GET: player bio
│   │               └── stats/route.ts  # GET: game log (?season=2025)
│   ├── components/
│   │   ├── PlayerRow.tsx           # Reusable player list item
│   │   ├── PlayerModal.tsx         # Full player detail modal
│   │   ├── GameLogTable.tsx        # Position-aware stat table
│   │   ├── TradeCard.tsx           # Single trade display
│   │   ├── TeamCard.tsx            # Team summary card
│   │   ├── RookieRow.tsx           # Draft pick / rookie display
│   │   ├── PositionBadge.tsx       # Color-coded position pill
│   │   ├── SeasonSelector.tsx      # Year tabs for stat modal
│   │   ├── TeamSelector.tsx        # "Set as My Team" picker
│   │   ├── LeagueInput.tsx         # League ID input
│   │   ├── SyncButton.tsx          # Manual "Refresh Data" button
│   │   └── Nav.tsx                 # Navigation
│   ├── lib/
│   │   ├── db.ts                   # SQLite connection, schema init, PRAGMA WAL
│   │   ├── sync.ts                 # Sync logic: Sleeper + nflverse → SQLite
│   │   ├── sleeper-api.ts          # Sleeper fetch functions (server-only)
│   │   ├── nflverse.ts             # nflverse CSV download + parse (server-only)
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── constants.ts            # Position colors, league ID, refresh intervals
│   │   └── utils.ts                # Helpers: formatDate, calcYPC, normalizeStats
│   ├── context/
│   │   └── LeagueContext.tsx       # React context: league info, "my team" (localStorage)
│   └── hooks/
│       ├── useLeague.ts            # Fetch league data from /api/league
│       ├── usePlayerStats.ts       # Fetch stats from /api/players/[id]/stats
│       └── useRosters.ts           # Fetch rosters from /api/rosters
└── next.config.js                  # Image remotePatterns for sleepercdn.com
```
