# Player Detail Modal

Triggered by clicking any player anywhere in the app.

## Header

- Large headshot: `https://sleepercdn.com/content/nfl/players/<player_id>.jpg` (fallback to nflverse `headshot_url`, then silhouette)
- Player full name (large)
- Position badge (color-coded) + NFL team abbreviation
- Bio: Age | Height | Weight | Experience (years_exp) | College
- Injury indicator if `injury_status` is not null (Out, Doubtful, Questionable, IR)

## Season Selector

Horizontal pill tabs: 2025, 2024, 2023, 2022, etc. Determine range from `years_exp`. Default to current/most recent season. Clicking a year loads that season's stats from the API route.

## Game Log Table — Position-Specific Columns

### QB
| Category | Columns |
|---|---|
| Game Info | WK, OPP |
| Fantasy | FPTS |
| Passing | ATT, CMP, YD, TD, INT |
| Rushing | ATT, YD, YPC, TD |
| Sacked | SK, YDS |
| Fumble | FUM, LOST |

### RB
| Category | Columns |
|---|---|
| Game Info | WK, OPP |
| Fantasy | FPTS |
| Rushing | ATT, YD, YPC, TD |
| Receiving | TGT, REC, YD, TD |
| Fumble | FUM, LOST |

### WR / TE
| Category | Columns |
|---|---|
| Game Info | WK, OPP |
| Fantasy | FPTS |
| Receiving | TGT, REC, YD, TD |
| Rushing | ATT, YD, TD |
| Fumble | FUM, LOST |

### K (Kicker)
| Category | Columns |
|---|---|
| Game Info | WK, OPP |
| Fantasy | FPTS |
| FG | FGA, FGM, FG% |
| XP | XPA, XPM |

### DEF
| Category | Columns |
|---|---|
| Game Info | WK, OPP |
| Fantasy | FPTS |
| Defense | SACK, INT, FR, TD, PA, YD_AGN |

## Season Totals Row

Bottom of game log — "TOTALS" row with summed stats. Computed by SQL `SUM()` grouped by player + season. No separate API call needed.

## Data Flow

1. UI opens modal → calls `GET /api/players/[sleeper_id]/stats?season=2025`
2. API route maps sleeper_id → gsis_id via `player_id_map`
3. Queries `player_stats` table for gsis_id + season (nflverse data)
4. If missing → falls back to Sleeper undocumented stats → normalizes → caches → returns
5. UI renders position-appropriate columns based on player's position

## Edge Cases

- Bye weeks: show the week row with dashes in all stat cells
- DEF player IDs are team abbreviations ("DET", "CAR") — no headshots, use team icon
- Missing ID mapping: fall back to Sleeper stats using the original sleeper_id
- Stats endpoint down: show "Stats temporarily unavailable" — never crash
