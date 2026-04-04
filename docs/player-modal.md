# Player Detail Modal

Triggered by clicking any player anywhere in the app. Full-width overlay or dedicated view.

## Overall Layout — Three Sections

The modal is divided into a full-width header on top, then the body splits into two columns:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: headshot + name + bio + rankings (full width)       │
├──────────────────────────────────┬───────────────────────────┤
│                                  │  LATEST NEWS              │
│  GAME LOG TABLE                  │  (independently scrolls)  │
│  (independently scrolls)         ├───────────────────────────┤
│                                  │  DEPTH CHART              │
│                                  │  (independently scrolls)  │
│  ~65% width                      │  ~35% width               │
└──────────────────────────────────┴───────────────────────────┘
```

The stats table and right sidebar are each independently scrollable (`overflow-y: auto` on each). The header stays fixed/pinned at the top of the modal.

---

## Section 1: Header (full width, fixed)

### Layout
- Left: player headshot (~120-140px, rounded). Team-color gradient or banner fills the background behind it.
- Center-right of headshot: player name, then bio stats, then rankings — laid out horizontally.
- Bottom-left corner overlapping the headshot area: position badge pill + "TEAM #NUMBER" (e.g., `RAMS #22`).

### Relative Text Sizing (largest → smallest)

| Element | Size | Style | Example |
|---|---|---|---|
| Player full name | **XXL** — largest text in the entire modal | Bold, white | `Trent McDuffie` |
| Bio values | **XL** — ~75-85% of name | Bold, white | `25`, `5'11"`, `193 lbs`, `4` |
| College name | **XL** — same as bio values | Bold, white | `Washington` |
| Rankings numbers | **L** — ~60% of name | Bold, white | `#69`, `#5960` |
| Rankings % values | **L** — same | Bold, white | `28%`, `11%` |
| Bio labels | **XS** — smallest in header | All-caps, muted/gray, lightweight | `AGE`, `HEIGHT`, `WEIGHT`, `EXP`, `COLLEGE` |
| Rankings labels | **XS** — same | All-caps, muted/gray, after the number | `DB`, `OVERALL`, `ROSTERED`, `STARTED` |
| Position badge | **S** — compact pill | Bold white text on position-colored background | `DB` |
| Team + jersey | **S** — sits beside the position pill | Semi-bold, lighter than white | `RAMS #22` |

### Bio Stats Row
Horizontal row of label/value pairs with generous spacing:
```
AGE        HEIGHT      WEIGHT       EXP       COLLEGE
25         5'11"       193 lbs      4         Washington
```
Labels on top (tiny, all-caps, muted), values directly below (large, bold, white). Spaced evenly, reading left to right.

### Rankings Row
Same visual pattern as bio — numbers are big and prominent, labels are small and muted:
```
#69 DB    #5960 OVERALL    28% ROSTERED    11% STARTED
```
The label is a subscript-style tag immediately after the number, not above/below it.

### Injury Indicator
If `injury_status` is not null, show a colored badge near the player name. Red = Out/IR, orange = Doubtful, yellow = Questionable.

---

## Section 2: Stats Panel (left ~65%, independently scrollable)

### "GAME LOGS" Label
Small-caps section header pinned top-left of the stats panel.

### Season Selector
- Horizontal row of year pills centered between the header and the table: `2025  2024  2023  2022  2021  MORE`
- Selected year: pill has a visible highlight (border or filled background) — clearly stands out
- Unselected years: muted text, no background
- Pill size: compact, roughly S-size text inside a rounded rect
- Range of years derived from `years_exp`. Default to most recent season.

### Game Log Table

**Visual hierarchy:**
- **Category group headers** span across their child columns — small-caps, XS-size, muted. These are labels like `FANTASY`, `PASS`, `RUSHING`, `SACKED`, `FUMBLE`. They sit as a row above the actual column headers, visually grouping them.
- **Column headers** directly under each group — small-caps, XS-size, muted. `WK`, `OPP`, `FPTS`, `ATT`, `CMP`, `YD`, `TD`, `INT`, etc.
- **Data cells** — S-size, regular weight, white. This is the most-read text, so it should be clearly legible but compact.
- **FPTS column** stands out: it has a subtly different background tint from the other columns to draw the eye.
- **OPP column**: team abbreviations, with `@` prefix for away games. Opponent names can be team-color tinted.
- **Alternating row backgrounds** for scannability (every other row slightly lighter).
- **Dashes** (`-`) for bye weeks, inactive weeks, or missing data — rendered muted.
- **CAREER / TOTALS row** at the very bottom — bold, acts as a summary row with summed season stats. Computed via SQL `SUM()`, no extra API call.

**Scroll behavior:**
- The table body scrolls vertically to show all 18 weeks. The column headers stay sticky at the top.
- On narrow viewports, the table scrolls horizontally as well. But on a full-width desktop modal it should fit without horizontal scroll.

### Position-Specific Columns

#### QB
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | PROJ, FPTS |
| — | SNP% |
| PASS | ATT, CMP, YD, TD, INT |
| RUSHING | ATT, YD, YPC, TD |
| SACKED | SK, YDS |
| FUMBLE | FUM, LOST |

#### RB
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | PROJ, FPTS |
| — | SNP% |
| RUSHING | ATT, YD, YPC, TD |
| RECEIVING | TGT, REC, YD, TD |
| FUMBLE | FUM, LOST |

#### WR / TE
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | PROJ, FPTS |
| — | SNP% |
| RECEIVING | TGT, REC, YD, TD |
| RUSHING | ATT, YD, TD |
| FUMBLE | FUM, LOST |

#### K (Kicker)
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | PROJ, FPTS |
| FG | FGA, FGM, FG% |
| XP | XPA, XPM |

#### DB / LB / DL (IDP defensive players)
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | PROJ, FPTS |
| — | SNAP |
| — | TKL, SACK, FF, FR, INT, TD |

#### DEF (team defense/special teams)
| Group | Columns |
|---|---|
| — | WK, OPP |
| FANTASY | FPTS |
| DEFENSE | SACK, INT, FR, TD, PA, YD_AGN |

---

## Section 3: Right Sidebar (~35%, two stacked sub-sections)

The sidebar is split into two sub-sections, each with its own independent vertical scroll.

### Latest News (top half of sidebar)

- **"LATEST NEWS"** — small-caps section header, same style as "GAME LOGS"
- **Headline**: M-L size, bold, white. Largest text in the sidebar. Can wrap to 2-3 lines.
- **Source + timestamp**: XS size, muted. Immediately below headline. (e.g., "a month ago via Rotowire")
- **Body text**: S size, regular weight, slightly muted. Dense paragraph. Wraps naturally in sidebar.
- **"Analysis:" label** (if present) is bold inline within the body text.
- If multiple news items, stack vertically with dividers between.
- If no news: show muted "No recent news" placeholder.
- **This sub-section scrolls independently** if content overflows its allocated height.
- **News is optional for MVP** — Sleeper and nflverse don't provide news. Can add later via ESPN API. If not implemented, either hide the sub-section or show a placeholder.

### Depth Chart (bottom half of sidebar)

- **"DEPTH CHART"** — small-caps section header
- Lists the player's NFL team depth chart grouped by position.
- Each position group:
  - Position label: **S size, bold, position-colored** (e.g., `QB` in red, `RB` in green, `WR1` in blue)
  - Player names listed below/beside the label: **S size, regular weight, white**
  - Starter is the first name, backups are indented or listed sequentially below
- Position groups stack vertically: QB → RB → WR1 → WR2 → WR3 → TE → etc.
- **This sub-section scrolls independently** — depth charts can be long.
- Data source: Sleeper `GET api.sleeper.com/players/nfl/<team>/depth_chart`
- If unavailable, hide this sub-section.

---

## Data Flow

1. UI opens modal → calls `GET /api/players/[sleeper_id]/stats?season=2025`
2. API route maps sleeper_id → gsis_id via `player_id_map`
3. Queries `player_stats` table for gsis_id + season (nflverse data)
4. If missing → falls back to Sleeper undocumented stats → normalizes → caches → returns
5. UI renders position-appropriate columns based on player's position
6. Sidebar: depth chart fetched from Sleeper. News fetched separately (if implemented).

## Headshot Sources (fallback chain)
1. `https://sleepercdn.com/content/nfl/players/<player_id>.jpg`
2. nflverse `headshot_url` field (NFL.com CDN)
3. Silhouette/placeholder icon

## Edge Cases

- Bye weeks: show the week row with dashes in all stat cells
- DEF player IDs are team abbreviations ("DET", "CAR") — no headshots, use a team-colored shield icon
- Missing ID mapping: fall back to Sleeper stats using the original sleeper_id
- Stats endpoint down: show "Stats temporarily unavailable" in the table area — never crash
- No news available: hide or show muted placeholder
- No depth chart available: hide sub-section
- Mobile: collapse to single column — header → stats table → news → depth chart, all stacked vertically with full-width