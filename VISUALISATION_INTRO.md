# Dashboard API and visualization guide

This is the implementation contract for a future frontend developer or AI. Read alongside [SNOWFLAKE_SCHEMA.md](./SNOWFLAKE_SCHEMA.md). All routes below are implemented GET endpoints under `/api/analytics`. Data is synthetic and should be labeled **Demo data**.

## Start and architecture

Run `npm install` in `backend`, configure its `.env` with the existing Snowflake account credentials, then `npm start` (or `npm run dev`). The server connects to Snowflake before listening; its default port is 3000. Set `PORT` and `FRONTEND_ORIGIN` to match the frontend. Required environment values: `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USERNAME`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_WAREHOUSE`, `SNOWFLAKE_DATABASE=FANLYTICS_DB`, `SNOWFLAKE_SCHEMA`, `SNOWFLAKE_ROLE`. Do not put these credentials in the frontend.

Route → controller → service (validation/response) → repository (SQL) → existing Snowflake query helper. Queries use `READ_READY.REVIEWS_FACT` within the configured database. `/freshness` additionally reads `READ_READY.GAME_METRICS`. No migrations or writes are performed by analytics endpoints.

These routes follow the existing API's unauthenticated behavior. Admin authorization is not implemented here; apply it before exposing dashboard data publicly, especially free-text feedback. Ticket codes, ticket IDs, seat numbers and user credentials are not returned. Feedback can still contain personal information supplied by a fan; render it as plain text.

## Shared filters

Every endpoint accepts the same filter vocabulary. Unknown parameters, repeated parameters, arrays, blank values and invalid values return HTTP 400 with `{ "message": "..." }`.

| Parameter | Meaning |
|---|---|
| `gameId`, `stadiumId` | Positive safe integer IDs; exact match. |
| `team` | Exact team name, matching home OR away. URL-encode text. |
| `city`, `section` | Exact city/section text, max 255 characters (also applies to team). |
| `dateFrom`, `dateTo` | Valid `YYYY-MM-DD`, inclusive game-date range. `dateFrom <= dateTo`. These filter **GAME_DATE**, not ingestion date. |
| `metric` | `overall` (default), `security`, `organization`, `family_friendly`, `experience`, `comfort`, `game`. Selects AVG_SCORE, satisfaction, distribution, matrix, low-score list and score filters. |
| `minScore`, `maxScore` | Integers 1–5, applied to the selected metric before aggregation. |
| `interval` | `day` (default), `week`, `month`; controls `/trends` only. Week boundaries follow the Snowflake session's WEEK_START setting. |
| `minReviews` | Positive integer, default 1. HAVING threshold for grouped comparisons, teams, heatmap and trends only. Counts fact rows. |
| `limit` | Page size 1–500, default 100, for paginated routes only. |
| `offset` | Offset 0–1,000,000, default 0, for paginated routes only. |

Example: `/api/analytics/distribution?gameId=12&metric=security&dateFrom=2026-01-01&dateTo=2026-12-31`.

A filter on a score intentionally changes the population of all other metrics in that request. Keep active filters visible. `team` selects games involving the team; it does not identify which club the reviewer supports.

## Response and frontend handling

New endpoints return `{ "data": [...], "meta": { "source": "READ_READY.REVIEWS_FACT", "metric": "overall", "filters": {...} } }`. Database column names are uppercase. Paginated endpoints also return `meta.limit`, `meta.offset`, `meta.hasMore`. Request the next page with `offset + limit` while `hasMore` is true. There is no total count; do not infer one from page length.

**Compatibility:** `/games` and `/sections/:gameId` return bare arrays, preserving their previous contract. They accept pagination filters but have no `hasMore` metadata; request another page when a page is full. `/sections/:gameId` overrides query `gameId` with the path ID. `/games` now aggregates filtered facts instead of using the asynchronously refreshed GAME_METRICS table, and includes more rating fields. Games with no reviews do not appear.

HTTP 500 returns `{ "message": "Failed to fetch analytics" }`. Display loading, empty, and retry states. Cancel stale requests when filters change. Render all user text with normal React escaping, never raw HTML. A successful query with no matching records is not a 404.

### Shared fields and definitions

- `REVIEW_COUNT`: fact-row count, not attendance or unique respondents. `REVIEWED_TICKETS`: distinct non-null ticket IDs where provided.
- `AVG_OVERALL`, `AVG_SECURITY`, `AVG_ORGANIZATION`, `AVG_FAMILY_FRIENDLY`, `AVG_EXPERIENCE`, `AVG_COMFORT`, `AVG_GAME`: averages rounded to two decimals; SQL AVG ignores nulls. These assume scores follow the 1–5 schema; malformed out-of-range pipeline values are not scrubbed from these seven averages.
- `RATED_COUNT`: valid 1–5 responses for the selected metric. `AVG_SCORE`: average of those valid responses. `LOW_SCORE_COUNT`: selected metric scores 1 or 2.
- `SATISFACTION_PCT`: selected metric scores 4 or 5 divided by its valid 1–5 responses, multiplied by 100. This is **not NPS**.
- Null averages/percentages mean no valid observations, never a score of zero. Show “No data.” Use a fixed 1–5 axis for ratings and 0–100 for percentages.
- Fact duplicates are counted; no arbitrary deduplication is applied. Do not average averages across games; use `/summary` for a review-weighted aggregate.

## Endpoint catalog

“Comparison fields” below means REVIEW_COUNT, REVIEWED_TICKETS, all seven AVG_* fields, RATED_COUNT, AVG_SCORE, LOW_SCORE_COUNT, SATISFACTION_PCT.

| Route | Returned columns / grain | Recommended visualization and interaction | Pagination |
|---|---|---|---|
| `/summary` | One row: comparison fields plus GAME_COUNT, STADIUM_COUNT, LATEST_INGESTED_AT | KPI cards: reviews, games, average selected score, satisfaction. Counts are 0 on empty data; averages null. | No |
| `/games` | One row per GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE; comparison fields | Match comparison bar chart or table. Newest game first. Label “Home vs Away”; click applies gameId. Bare array response. | Yes |
| `/stadiums` | STADIUM_ID, STADIUM_NAME, STADIUM_CITY; comparison fields | Horizontal bars with review counts in tooltips; comparison table. Click stadium to drill down. Sorted by stadium identity, not rank. | Yes |
| `/sections` | STADIUM_ID, STADIUM_NAME, SECTION; comparison fields | Section heatmap or bar chart, scoped to stadium/game. Section labels are unique only within a stadium. | Yes |
| `/sections/:gameId` | Same as `/sections`, forced game filter | Existing game drilldown compatibility route; returns a bare array. | Yes |
| `/cities` | STADIUM_CITY; comparison fields | City comparison bars/table. No coordinates are available for a geographic map. Null city should be “Unknown.” | Yes |
| `/teams` | TEAM; comparison fields | Ranked bars sorted by AVG_SCORE descending, then team. Each game review contributes to BOTH participating teams; label “Experience at games involving team.” | Yes |
| `/categories` | Seven rows: METRIC, RATED_COUNT, AVG_SCORE, LOW_SCORE_COUNT, HIGH_SCORE_COUNT | Horizontal category bars, or radar chart with fixed 1–5 radius. HIGH_SCORE_COUNT means 4–5; low means 1–2. Even an empty dataset returns seven rows with null averages. | No |
| `/distribution` | Five rows: SCORE (1–5), REVIEW_COUNT, PERCENTAGE for selected metric | Ordered five-bar histogram or stacked percentage bar. Includes zero-count scores. Percentages null when there are no valid ratings. | No |
| `/trends` | PERIOD plus comparison fields; grouped by game day/week/month | Two aligned charts: line for AVG_SCORE and columns for REVIEW_COUNT. PERIOD is bucketed GAME_DATE. Missing buckets are omitted; fill count gaps with 0 and rating gaps with null if desired. Ordered oldest first; fetch all pages for the full range. | Yes |
| `/rating-matrix` | OVERALL_SCORE, SCORE (selected metric), REVIEW_COUNT | 5×5 heatmap: x selected metric, y overall, intensity count. Missing cells are zero. Default overall yields a diagonal; choose security/comfort/etc. for useful comparisons. | No |
| `/seat-heatmap` | GAME_ID, STADIUM_ID, SECTION, ROW_NUMBER; comparison fields | Section-by-row grid colored by AVG_SCORE. Select one game and stadium first. This is row-level aggregation, not a physical seating map; no geometry or individual seat scores are supplied. | Yes |
| `/reviews` | GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE, STADIUM_ID, STADIUM_NAME, SECTION, all seven *_SCORE columns, FEEDBACK_TEXT, INGESTED_AT | Paginated review table, newest ingested first. Scores are raw individual values. Use page position as a local display key; there is no exposed stable review ID. | Yes |
| `/feedback` | Same columns as `/reviews`; only nonblank comments | Comment cards/table with score badge and game label. Do not infer automated sentiment: no sentiment model exists. | Yes |
| `/low-scores` | Same columns as `/reviews`; selected metric is 1 or 2 | Issue triage table. Example `?metric=security` surfaces low security feedback; it does not classify verified security incidents. | Yes |
| `/correlations` | Seven rows: METRIC, PAIRED_COUNT, CORRELATION | Diverging bars from -1 to 1: Pearson correlation of each category with overall. Null means insufficient variation/data. Show sample size; correlation is not causation. Overall self-correlation is a reference only. | No |
| `/filter-options` | Distinct GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE, STADIUM_ID, STADIUM_NAME, STADIUM_CITY, SECTION combinations | Cascading game/stadium/city/section/team dropdowns. Deduplicate each option list; fetch all pages, or request a narrower game/stadium. These are observed review dimensions, not a complete fixture catalog. | Yes |
| `/freshness` | One row: REVIEW_COUNT, REVIEWED_TICKETS, EXTRA_OR_NULL_TICKET_ROWS, EARLIEST_INGESTED_AT, LATEST_INGESTED_AT, METRICS_LAST_REFRESHED | Data status panel. Extra/null ticket rows are a quality indicator. METRICS_LAST_REFRESHED is a global maximum from GAME_METRICS, regardless of filters; other fields respect filters. | No |

Grouped endpoints exclude groups below minReviews, but summary/distribution/categories do not. Teams count each review twice across the entire team list, so do not sum team counts to get total reviews. For large result sets, the first page is not a complete chart; fetch remaining pages or narrow filters. Offset pagination is intended for this demo and can shift if data arrives between requests.

## Suggested dashboard layout

1. Top: game-date range, game, stadium, team, section and selected metric controls; data freshness badge.
2. KPI row from `/summary`.
3. Category profile from `/categories`, score histogram from `/distribution`.
4. Timeline from `/trends`, stadium comparison from `/stadiums`, game comparison from `/games`.
5. Drilldown: `/sections`, `/seat-heatmap`, `/rating-matrix`.
6. Exploration: `/teams`, `/cities`, `/correlations`.
7. Review table from `/reviews`, comment feed from `/feedback`, issues from `/low-scores`.

Example fetch:

```js
const params = new URLSearchParams({ gameId: '12', metric: 'security' });
const response = await fetch(`${API_BASE}/api/analytics/summary?${params}`);
if (!response.ok) throw new Error('Analytics unavailable');
const { data } = await response.json();
const summary = data[0]; // summary.AVG_SCORE, summary.SATISFACTION_PCT
```

## Data engineering semantics and limits

New submissions travel through ingestion → enrichment → read-ready tasks. A 202 review submission does not mean the dashboard has refreshed yet. INGESTED_AT is pipeline ingestion time, not necessarily when the fan submitted the review. LATEST_INGESTED_AT is not a task-health signal: an idle pipeline and a stalled pipeline can look the same. This API does not inspect task failures or compute ingestion latency.

TIMESTAMP_NTZ has no timezone. Agree on the dataset's time convention before formatting local dates; do not silently claim UTC. The API groups trends using Snowflake's timestamps.

No fan demographics, attendance, ticket-sales revenue, geocoordinates, sentiment, or club affiliation are present in the review fact. Do not invent these charts. The current API does not provide ticket response rates or zero-review games. Those need operational ticket/game joins with carefully defined denominators.

## Validation and follow-up

`cd backend && npm test` tests filter rejection, bound values, pagination, HTTP route registration, legacy response compatibility, and error handling using an injected query stub. These tests do not prove SQL execution in Snowflake. Run each endpoint against the team's configured warehouse to verify permissions, actual data, timestamp serialization and query performance before the demo. All SQL uses names from SNOWFLAKE_SCHEMA.md. No live warehouse execution was required to implement this API.
