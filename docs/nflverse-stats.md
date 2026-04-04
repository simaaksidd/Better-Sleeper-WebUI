# nflverse Stats Reference

Open-source community project. Pre-computed weekly NFL player stats as free CSV files on GitHub. No API key, no rate limits. Data back to 1999.

## Download URLs

| Data | URL |
|---|---|
| Player stats (one season) | `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_<year>.csv` |
| Player stats (all seasons) | `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats.csv` |
| Player ID mapping | `https://github.com/nflverse/nflverse-data/releases/download/players/players.csv` |
| Schedules | `https://github.com/nflverse/nflverse-data/releases/download/schedules/schedules.csv` |

Use per-season CSVs (not the mega-file). During season, re-download current season CSV daily.

## Player ID Mapping (CRITICAL)

nflverse uses GSIS IDs (`"00-0033908"`). Sleeper uses its own numeric IDs (`"4039"`).
**There is no direct conversion** — these are independent ID systems with no formula between them.

**nflverse `players.csv` does NOT have a `sleeper_id` column.** The mapping must be
built by bridging through shared fields available in both systems.

### Mapping Strategy (three tiers, in priority order)

1. **`gsis_id` from Sleeper** — Sleeper's `/players/nfl` endpoint includes a `gsis_id` field
   on some players. When present, this is the same GSIS ID nflverse uses. Covers ~33% of
   active skill players.

2. **`espn_id` bridge** — Both Sleeper and nflverse include `espn_id`. Match
   `Sleeper.espn_id → nflverse.espn_id → gsis_id`. Catches another ~15% of players.

3. **Normalized name matching** — Match Sleeper `full_name` to nflverse `display_name`
   after stripping suffixes (Jr., III, II, etc.), punctuation, and lowercasing. Sleeper
   often drops suffixes that nflverse keeps (e.g. "Kenneth Walker" vs "Kenneth Walker III").
   Catches most remaining rostered players. Position is NOT used in the match key because
   the two systems sometimes disagree (e.g. Travis Hunter: WR in Sleeper, CB in nflverse).

**Combined coverage: ~99% of rostered players.** The few that remain unmapped fall through
to the Sleeper undocumented stats fallback.

### Lookup flow

1. Sleeper roster gives player_id `"4039"` (Cooper Kupp)
2. Query `player_id_map WHERE sleeper_id = '4039'` → `gsis_id = '00-0033908'`
3. Query `player_stats WHERE player_id = '00-0033908' AND season = 2025`

If no mapping exists → fall back to Sleeper undocumented stats endpoint for that player.

## Key Columns in player_stats CSV (113 total, listing relevant ones)

```
player_id             — GSIS ID (NOT Sleeper ID)
player_name           — Short name ("P.Mahomes")
player_display_name   — Full name ("Patrick Mahomes")
position              — QB, RB, WR, TE, K
position_group        — QB, RB, WR, TE, SPEC, OL
headshot_url          — NFL.com headshot (backup to Sleeper CDN)
season                — 2025, 2024, etc.
week                  — 1-18
season_type           — "REG" or "POST"
team                  — "KC", "DET", etc.
opponent_team         — "DET", "KC", etc.
games                 — Games played

# Passing
completions, attempts, passing_yards, passing_tds, passing_interceptions,
sacks_suffered, sack_yards_lost, sack_fumbles, sack_fumbles_lost,
passing_air_yards, passing_yards_after_catch, passing_first_downs,
passing_epa, passing_cpoe, passing_2pt_conversions

# Rushing
carries, rushing_yards, rushing_tds, rushing_fumbles, rushing_fumbles_lost,
rushing_first_downs, rushing_epa, rushing_2pt_conversions

# Receiving
receptions, targets, receiving_yards, receiving_tds,
receiving_fumbles, receiving_fumbles_lost, receiving_air_yards,
receiving_yards_after_catch, receiving_first_downs, receiving_epa,
receiving_2pt_conversions, target_share, air_yards_share, wopr

# Fantasy
fantasy_points        — Standard scoring
fantasy_points_ppr    — PPR scoring

# Kicking
fg_made, fg_att, fg_missed, fg_pct,
pat_made, pat_att, pat_missed, pat_pct
```

## Stat Mapping: nflverse → UI Columns

### QB
```
completions → CMP          carries → ATT (rushing)
attempts → ATT (passing)   rushing_yards → YD (rushing)
passing_yards → YD         rushing_yards/carries → YPC
passing_tds → TD           rushing_tds → TD (rushing)
passing_interceptions → INT
sacks_suffered → SK        total fumbles → FUM
sack_yards_lost → YDS      total fumbles_lost → LOST
fantasy_points_ppr → FPTS
```

### RB
```
carries → ATT              targets → TGT
rushing_yards → YD         receptions → REC
rushing_yards/carries → YPC receiving_yards → YD (receiving)
rushing_tds → TD           receiving_tds → TD (receiving)
```

### WR / TE
```
targets → TGT              carries → ATT (rushing)
receptions → REC           rushing_yards → YD (rushing)
receiving_yards → YD       rushing_tds → TD (rushing)
receiving_tds → TD
```

### K
```
fg_made → FGM    fg_att → FGA    fg_made/fg_att*100 → FG%
pat_made → XPM   pat_att → XPA
```

## Sleeper Fallback Key Mapping

When using Sleeper undocumented stats as fallback, normalize to same shape:
```
Sleeper key → nflverse equivalent
pass_att → attempts           rush_att → carries
pass_cmp → completions        rush_yd → rushing_yards
pass_yd → passing_yards       rush_td → rushing_tds
pass_td → passing_tds         rec → receptions
pass_int → passing_interceptions  rec_yd → receiving_yards
pass_sack → sacks_suffered    rec_td → receiving_tds
fum → total fumbles           rec_tgt → targets
fum_lost → total fumbles_lost pts_ppr → fantasy_points_ppr
pts_std → fantasy_points
```

## Stats Fallback Chain

```
1. SQLite player_stats (nflverse data)
   ├─ Found → return
   └─ Missing →
2. Sleeper undocumented: api.sleeper.com/stats/nfl/player/<sleeper_id>?...
   ├─ Success → normalize, cache with source="sleeper_fallback", return
   └─ Failure →
3. Return empty: "Stats not yet available"
```

## Timing

nflverse data updates within hours of game completion, not real-time. On Sunday nights during live games, current week data won't be in nflverse yet. That's when the Sleeper fallback is needed. By Monday morning, nflverse has everything.
