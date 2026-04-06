# Sleeper Dashboard

A fantasy football league dashboard that connects to the [Sleeper](https://sleeper.com) API. View rosters, trades, draft history, rookies, and player stats — all in a dark-themed, data-dense UI.

## Features

- **My Team** -- View your roster with starters, bench, and draft picks
- **All Teams** -- Browse every team in your league side-by-side
- **Trades** -- See all trades with full player and pick details
- **History** -- Season-by-season draft and transaction history
- **Rookies** -- Rookie class browser with college stats and news
- **Player Modal** -- Tap any player to see game logs, depth chart position, news, and season stats
- **Sync** -- One-click sync pulls the latest data from Sleeper and caches it in a local SQLite database

## Tech Stack

- **Next.js 16** (App Router) with React 19
- **Tailwind CSS 4** for styling
- **better-sqlite3** for local data caching
- **nflverse** data for player stats and game logs
- **Sleeper API** for league, roster, and transaction data

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Connect your league

1. On first load you'll see a welcome screen
2. Enter your Sleeper league ID and hit **Sync**
3. Select your team from the dropdown

Your league ID is in the URL when you view your league on Sleeper: `https://sleeper.com/leagues/<league_id>`

## Project Structure

```
src/
  app/              # Next.js pages and API routes
    api/            # REST endpoints (rosters, trades, drafts, sync, etc.)
    history/        # Draft/transaction history page
    rookies/        # Rookie browser page
    teams/          # All teams page
    trades/         # Trades page
  components/       # UI components (PlayerModal, TradeCard, Nav, etc.)
  context/          # LeagueContext (league ID, sync state, NFL state)
  hooks/            # Data-fetching hooks (useRosters, usePlayerStats, etc.)
  lib/              # Sleeper API client, DB layer, types, utilities
data/
  sleeper.db        # Local SQLite database (auto-created on first sync)
```

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start dev server         |
| `npm run build` | Production build         |
| `npm start`     | Start production server  |
| `npm run lint`  | Run ESLint               |

## License

Apache 2.0 -- see [LICENSE](LICENSE) for details.
