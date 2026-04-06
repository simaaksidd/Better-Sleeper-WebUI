Rookie Data Strategy
Rookies are incoming players who have declared for the 2026 NFL Draft but haven't played an NFL game. They have no NFL stats, no NFL headshots, and no NFL news. All data for these players must come from their college career.
The Problem
When a rookie appears on the Rookies page or in a player modal, everything returns null because:

nflverse has no stats for them (they haven't played in the NFL)
sleepercdn may not have a headshot yet (or it's a gray silhouette)
No NFL news exists for them
They're not on an NFL depth chart yet (pre-draft) or are buried at the bottom (post-draft)

Data Sources for Rookies
DataSourceNotesBio (name, position, college, height, weight)Sleeper /players/nflAlready have this — rookies with years_exp=0 are in Sleeper's player DBHeadshotESPN college football CDNCollege uniform photo — the right look for pre-NFL playersCollege stats (season totals + per-game)ESPN undocumented APIFree, no auth, no key. College football athlete endpoints.College newsESPN college football newsFree, no auth. Player-specific or team-specific news.NFL Combine resultsnflverse combine.csv40-yard dash, vertical, bench, broad jump, cone, shuttleDraft positionSleeper draft picks + nflverse draft dataWhich NFL team, what round/pickDepth chartPre-draft: N/A. Post-draft: Sleeper (NFL team depth chart)Only relevant after the NFL draft
Why ESPN for college data?
ESPN is the single best source because it provides headshots, stats, AND news from one place with zero authentication. CFBD (CollegeFootballData.com) has richer analytics but requires an API key with a 1,000 calls/month free tier — too tight for a sync that might hit 250+ players. ESPN has no published rate limits and the data is sufficient for a fantasy dashboard.

ESPN College Football Endpoints (all undocumented, all free, no auth)
Athlete search (find ESPN ID from player name)
GET https://site.api.espn.com/apis/common/v3/search?query=<player_name>&limit=5&mode=prefix
Returns search results across all ESPN sports. Filter results where type = "athlete" and league = "college-football". Extract the ESPN athlete ID from the result.
Athlete profile + season stats
GET https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/<espn_id>/stats
Returns career stats organized by season. Includes passing, rushing, receiving, and defensive stats per season.
Athlete overview (bio, team, headshot URL)
GET https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/<year>/athletes/<espn_id>
Returns height, weight, position, team, jersey number, date of birth, hometown, and a link to the headshot.
Per-game stats (drill-down — lazy fetch only)
GET https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/<espn_id>/gamelog?season=<year>
Returns individual game-by-game stats for a specific season. Only fetch when a user clicks into a specific college season in the modal.
College headshot URL pattern
https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/<espn_id>.png&w=350&h=254
Can adjust w and h params for different sizes. This shows the player in their college uniform.
College football news
GET https://site.api.espn.com/apis/site/v2/sports/football/college-football/news
General college football news. For player-specific news, there's no guaranteed endpoint — but you can filter the general feed or search.
NFL Draft / Recruiting
GET https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/<year>/recruits
Recruiting rankings by year. Useful for showing a rookie's recruiting star rating.

nflverse Combine Data
Download URL:
https://github.com/nflverse/nflverse-data/releases/download/combine/combine.csv
Key columns:
player_name, pos, school, ht, wt,
forty, vertical, bench, broad_jump, cone, shuttle,
draft_year, draft_team, draft_round, draft_ovr (overall pick),
pfr_id, cfb_id
Sync this CSV once during the draft/combine season (late Feb - April). Cache forever in a combine_results SQLite table. Join to rookies by player_name + school or by cfb_id if available.
Combine Display in Rookie Modal
Show combine metrics in the header area, below or beside the bio stats. Only display metrics that have values (not all players run every drill).
40-YD       VERTICAL    BENCH       BROAD JUMP    3-CONE    SHUTTLE
4.38s       36"         22 reps     128"          6.89s     4.12s
Same visual pattern as the NFL player bio row: tiny all-caps labels on top, large bold values below.

ID Bridging: Sleeper → ESPN (College)
This is the trickiest part. Sleeper player objects include an espn_id field, but for rookies/prospects it may not be populated, or it may be their NFL ESPN ID (different from their college ESPN ID).
Strategy:

Check if the Sleeper player object has espn_id → try it against the college-football athlete endpoint
If that fails or is missing, search by name: GET https://site.api.espn.com/apis/common/v3/search?query=<first_name>+<last_name>&limit=5
From search results, filter to college-football athletes, match on name + college (from Sleeper's college field)
Cache the resolved espn_college_id in the player_id_map table so you only search once per player

Add a column espn_college_id to the player_id_map table for this purpose.

SQLite Tables for Rookie Data
TableSourceRefreshcombine_resultsnflverse combine.csvOnce per year (Feb-April)college_stats_seasonESPN athlete stats endpointOnce per player, cache forevercollege_stats_gamesESPN athlete gamelog endpointLazy fetch, cache foreverplayer_id_map (add espn_college_id column)ESPN searchOn-demand, cache forever
Storage estimate: ~250 rookies × 4 seasons × 13 games = ~13,000 game rows. Plus ~250 season-total rows and ~250 combine rows. Total: well under 5MB. Trivial for SQLite.

Rookie Modal — How It Differs From NFL Player Modal
The rookie modal uses the same three-section layout as the NFL player modal, but with college-specific content:
Header

Headshot: ESPN college headshot (player in college uniform). Fallback: sleepercdn → silhouette.
Name, position, bio: Same layout as NFL modal.
College + team name where NFL team would normally go (e.g., "Washington Huskies" instead of "Rams #22").
Combine metrics row (if available): displayed below the bio stats using the same label-above/value-below pattern. Only show drills the player actually completed.
Draft stock: If already drafted, show "Round 1, Pick 12 — LAR". If pre-draft, show projected draft range if available, or omit.

Stats Panel (left ~65%)

Season selector: Shows college seasons (e.g., 2025 2024 2023 2022) instead of NFL seasons.
"COLLEGE GAME LOGS" label instead of "GAME LOGS".
Season totals view (default): One row per college season with aggregate stats. This is what loads first.
Per-game drill-down: Clicking a season expands or switches to per-game rows for that season. Lazy-fetched from ESPN, cached forever.
Same position-specific columns as the NFL game log — college stats have the same stat categories (passing, rushing, receiving, etc.).
"CAREER TOTALS" row at the bottom summing all college seasons.

Right Sidebar (~35%)

News: College football news from ESPN. Show general CFB news or filtered by player/team name. Label as "COLLEGE NEWS". If nothing relevant found, show "No recent news."
Depth Chart: Pre-draft → hide this section or show "Not yet on an NFL roster." Post-draft → show their NFL team's depth chart (same as regular players).
Scouting notes (optional/future): Could add draft analyst grades, strengths/weaknesses. Skip for MVP.


Sync Flow for Rookies
During initial sync or daily refresh:

From Sleeper players table, filter where years_exp = 0 AND status indicates draft-eligible
Download nflverse combine.csv → upsert into combine_results table (once per year)
For each rookie without an espn_college_id in player_id_map:

Search ESPN by name → resolve college athlete ID → cache in player_id_map
Add a 100ms delay between searches to be respectful to ESPN


For each rookie with a resolved espn_college_id:

Fetch season stats from ESPN → upsert into college_stats_season
Do NOT fetch per-game logs here — that's lazy/on-demand



On rookie modal open (lazy fetch):

Load bio from players table, combine data from combine_results, season stats from college_stats_season
If user clicks a specific college season → check college_stats_games table
If not cached → fetch from ESPN gamelog endpoint → cache forever → return
If ESPN call fails → show season totals only with message "Game details unavailable"

API Call Budget for Rookies:

ESPN name search: ~250 calls (one-time, cached forever)
ESPN season stats: ~250 calls (one-time per player, cached forever)
ESPN per-game logs: ~1 call per player per season clicked (lazy, cached forever)
nflverse combine CSV: 1 download per year
Total one-time cost: ~500 ESPN calls. Spread over a few syncs with delays, no rate limit issues.


Determining "2026 NFL Draft Eligible" Players
Sleeper's /players/nfl includes prospects before the draft. Filter by:

years_exp === 0 (no NFL experience)
status is not "Active" in the NFL (they haven't been rostered on an NFL team yet) — OR they were just drafted
Cross-reference with nflverse draft picks data once the draft happens

Before the NFL draft (pre-April): these are all declared prospects.
After the NFL draft: these are the players who were just drafted + undrafted free agents.
For your fantasy rookie draft, Sleeper's own draft endpoint (GET /league/<id>/drafts + /draft/<id>/picks) tells you exactly who your league has drafted, which is the ground truth for your Rookies page.
---
paths:
  - "src/app/rookies/**"
  - "src/app/api/rookies/**"
  - "src/components/RookieRow.tsx"
  - "src/lib/espn-college.ts"
---

# Rookie Data Rules

- Rookies have `years_exp=0` in Sleeper's player DB. They have NO NFL stats, often no sleepercdn headshot, and no NFL news.
- All rookie data comes from their COLLEGE career, not the NFL.
- Primary college data source: ESPN undocumented API (free, no auth). Full reference: `docs/rookie-data.md`
- College headshot URL: `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/<espn_id>.png&w=350&h=254`
- ID bridging: Sleeper player → search ESPN by name+college → get `espn_college_id` → cache in `player_id_map` forever.
- Combine data from nflverse `combine.csv` — download once per year, cache in `combine_results` table.
- College season stats: fetch once per player from ESPN, cache forever in `college_stats_season`.
- College per-game logs: lazy fetch ONLY when user clicks a specific season. Cache forever in `college_stats_games`.
- Never fetch college per-game logs during bulk sync — too many calls. Always lazy.
- Add 100ms delay between ESPN calls during rookie sync to avoid rate limiting.
- The rookie modal uses the same three-section layout as the NFL player modal but with college-specific content.
- `next.config.js` must include `a.espncdn.com` in `images.remotePatterns` for college headshots.
