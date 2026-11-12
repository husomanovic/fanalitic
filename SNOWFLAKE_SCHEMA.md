# Fanlytics — Snowflake Data Reference

This document describes the tables and columns currently shared from `FANLYTICS_DB`, and shows how to query them from the Node.js backend.

> **Source of truth:** table and column names/types are based on the Snowflake `INFORMATION_SCHEMA.COLUMNS` output shared by the team. Update this document when the schema changes. Example queries assume the database is `FANLYTICS_DB` and that the backend Snowflake role has `SELECT` privileges.
>
> **Dataset:** Match/ticket/review seed data is synthetic (Champions League–style), not real UEFA match or supporter feedback data.

## Quick guide — which table should I use?

| Use case | Table | Notes |
|---|---|---|
| Dashboard: review-level filters and charts | `READ_READY.REVIEWS_FACT` | **Preferred** for filtering by game, stadium, section and score. Denormalized; avoids repeated joins. |
| Dashboard: averages and review counts per game | `READ_READY.GAME_METRICS` | **Preferred** for summary cards and match comparisons. |
| Find a ticket by barcode | `PUBLIC_APP.TICKETS` | Join `GAMES`, `TEAMS`, `STADIUMS` for match details. |
| List clubs and logos | `PUBLIC_APP.TEAMS` | `LOGO_URL` may be null. |
| List stadiums | `PUBLIC_APP.STADIUMS` | Stadium capacities are present. |
| Match fixtures and scores | `PUBLIC_APP.GAMES` | Foreign-key ID columns link to team and stadium tables. |
| Seeded operational review records | `PUBLIC_APP.REVIEWS` | **Do not assume this receives new web-form reviews.** Current Node.js API writes to `INGESTION.REVIEWS_IN`; the pipeline populates `READ_READY.REVIEWS_FACT`. |
| Admin users | `PUBLIC_APP.USERS` | Sensitive: `PASSWORD_HASH` should never be exposed by public API endpoints. |
| Seed-generation helper | `PUBLIC_APP.FANLYTICS_SEED_CLUBS` | Supporting table, **not** recommended as an application API source. |

## Data dictionary

### `PUBLIC_APP` — operational/reference tables

#### `PUBLIC_APP.TEAMS`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `NAME` | `TEXT` |
| `LOGO_URL` | `TEXT` |

#### `PUBLIC_APP.STADIUMS`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `NAME` | `TEXT` |
| `CITY` | `TEXT` |
| `COUNTRY` | `TEXT` |
| `CAPACITY` | `NUMBER` |

#### `PUBLIC_APP.GAMES`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `HOME_TEAM_ID` | `NUMBER` |
| `GUEST_TEAM_ID` | `NUMBER` |
| `STADIUM_ID` | `NUMBER` |
| `GAME_DATE` | `TIMESTAMP_NTZ` |
| `SCORE_HOME` | `NUMBER` |
| `SCORE_GUEST` | `NUMBER` |

#### `PUBLIC_APP.TICKETS`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `GAME_ID` | `NUMBER` |
| `BARCODE` | `TEXT` |
| `PRICE` | `NUMBER` |
| `SECTION` | `TEXT` |
| `ROW_NUMBER` | `TEXT` |
| `SEAT_NUMBER` | `TEXT` |

#### `PUBLIC_APP.REVIEWS`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `TICKET_ID` | `NUMBER` |
| `OVERALL_SCORE` | `NUMBER` |
| `SECURITY_SCORE` | `NUMBER` |
| `ORGANIZATION_SCORE` | `NUMBER` |
| `FAMILY_FRIENDLY_SCORE` | `NUMBER` |
| `EXPERIENCE_SCORE` | `NUMBER` |
| `COMFORT_SCORE` | `NUMBER` |
| `GAME_SCORE` | `NUMBER` |
| `FEEDBACK_TEXT` | `TEXT` |
| `CREATED_AT` | `TIMESTAMP_NTZ` |

#### `PUBLIC_APP.USERS`

| Column | Type |
|---|---|
| `ID` | `NUMBER` |
| `NAME` | `TEXT` |
| `EMAIL` | `TEXT` |
| `PASSWORD_HASH` | `TEXT` |
| `ROLE` | `TEXT` |
| `CREATED_AT` | `TIMESTAMP_NTZ` |

#### `PUBLIC_APP.FANLYTICS_SEED_CLUBS` (seed helper)

| Column | Type |
|---|---|
| `CLUB_N` | `NUMBER` |
| `TEAM_NAME` | `TEXT` |
| `STADIUM_NAME` | `TEXT` |
| `CITY` | `TEXT` |
| `COUNTRY` | `TEXT` |
| `CAPACITY` | `NUMBER` |

### `READ_READY` — analytics tables

#### `READ_READY.REVIEWS_FACT`

**Grain:** intended as one review per ticket (`TICKET_ID`). Check duplicates in data; Snowflake standard table `UNIQUE`/`PRIMARY KEY` constraints do not enforce uniqueness.

| Column | Type |
|---|---|
| `TICKET_ID` | `NUMBER` |
| `TICKET_CODE` | `TEXT` |
| `GAME_ID` | `NUMBER` |
| `GAME_DATE` | `TIMESTAMP_NTZ` |
| `HOME_TEAM` | `TEXT` |
| `AWAY_TEAM` | `TEXT` |
| `STADIUM_ID` | `NUMBER` |
| `STADIUM_NAME` | `TEXT` |
| `STADIUM_CITY` | `TEXT` |
| `SECTION` | `TEXT` |
| `ROW_NUMBER` | `TEXT` |
| `SEAT_NUMBER` | `TEXT` |
| `OVERALL_SCORE` | `NUMBER` |
| `SECURITY_SCORE` | `NUMBER` |
| `ORGANIZATION_SCORE` | `NUMBER` |
| `FAMILY_FRIENDLY_SCORE` | `NUMBER` |
| `EXPERIENCE_SCORE` | `NUMBER` |
| `COMFORT_SCORE` | `NUMBER` |
| `GAME_SCORE` | `NUMBER` |
| `FEEDBACK_TEXT` | `TEXT` |
| `INGESTED_AT` | `TIMESTAMP_NTZ` |

#### `READ_READY.GAME_METRICS`

**Grain:** intended as one aggregated row per game (`GAME_ID`) after metric refresh.

| Column | Type |
|---|---|
| `GAME_ID` | `NUMBER` |
| `HOME_TEAM` | `TEXT` |
| `AWAY_TEAM` | `TEXT` |
| `GAME_DATE` | `TIMESTAMP_NTZ` |
| `REVIEW_COUNT` | `NUMBER` |
| `AVG_OVERALL` | `FLOAT` |
| `AVG_SECURITY` | `FLOAT` |
| `AVG_ORGANIZATION` | `FLOAT` |
| `AVG_FAMILY_FRIENDLY` | `FLOAT` |
| `AVG_EXPERIENCE` | `FLOAT` |
| `AVG_COMFORT` | `FLOAT` |
| `AVG_GAME` | `FLOAT` |
| `LAST_REFRESHED` | `TIMESTAMP_NTZ` |

## Table relationships

```text
PUBLIC_APP.TEAMS.ID <- GAMES.HOME_TEAM_ID
PUBLIC_APP.TEAMS.ID <- GAMES.GUEST_TEAM_ID
PUBLIC_APP.STADIUMS.ID <- GAMES.STADIUM_ID
PUBLIC_APP.GAMES.ID <- TICKETS.GAME_ID
PUBLIC_APP.TICKETS.ID <- REVIEWS.TICKET_ID
PUBLIC_APP.TICKETS.ID <- READ_READY.REVIEWS_FACT.TICKET_ID
PUBLIC_APP.GAMES.ID <- READ_READY.REVIEWS_FACT.GAME_ID
PUBLIC_APP.GAMES.ID <- READ_READY.GAME_METRICS.GAME_ID
```

These are logical joins. Not every relationship should be assumed to have a database-enforced constraint.

## Example SQL queries

### 1. List games and summary ratings

```sql
SELECT GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE,
       REVIEW_COUNT, ROUND(AVG_OVERALL, 2) AS AVG_OVERALL,
       ROUND(AVG_SECURITY, 2) AS AVG_SECURITY
FROM FANLYTICS_DB.READ_READY.GAME_METRICS
ORDER BY GAME_DATE DESC
LIMIT 50;
```

### 2. Ticket lookup (for fan review form)

```sql
SELECT T.ID AS TICKET_ID, T.BARCODE, T.SECTION,
       T.ROW_NUMBER, T.SEAT_NUMBER, G.ID AS GAME_ID,
       G.GAME_DATE, H.NAME AS HOME_TEAM, A.NAME AS AWAY_TEAM,
       S.NAME AS STADIUM
FROM FANLYTICS_DB.PUBLIC_APP.TICKETS T
JOIN FANLYTICS_DB.PUBLIC_APP.GAMES G ON G.ID = T.GAME_ID
JOIN FANLYTICS_DB.PUBLIC_APP.TEAMS H ON H.ID = G.HOME_TEAM_ID
JOIN FANLYTICS_DB.PUBLIC_APP.TEAMS A ON A.ID = G.GUEST_TEAM_ID
JOIN FANLYTICS_DB.PUBLIC_APP.STADIUMS S ON S.ID = G.STADIUM_ID
WHERE T.BARCODE = ?
LIMIT 1;
```

### 3. Ratings by section for a selected game

```sql
SELECT SECTION, COUNT(*) AS REVIEW_COUNT,
       ROUND(AVG(OVERALL_SCORE), 2) AS AVG_OVERALL,
       ROUND(AVG(SECURITY_SCORE), 2) AS AVG_SECURITY,
       ROUND(AVG(FAMILY_FRIENDLY_SCORE), 2) AS AVG_FAMILY_FRIENDLY
FROM FANLYTICS_DB.READ_READY.REVIEWS_FACT
WHERE GAME_ID = ?
GROUP BY SECTION
ORDER BY SECTION;
```

### 4. Recent review comments

```sql
SELECT GAME_ID, HOME_TEAM, AWAY_TEAM, SECTION,
       OVERALL_SCORE, SECURITY_SCORE, FEEDBACK_TEXT, INGESTED_AT
FROM FANLYTICS_DB.READ_READY.REVIEWS_FACT
WHERE FEEDBACK_TEXT IS NOT NULL
ORDER BY INGESTED_AT DESC
LIMIT 50;
```

### 5. Club list with logos

```sql
SELECT ID, NAME, LOGO_URL
FROM FANLYTICS_DB.PUBLIC_APP.TEAMS
ORDER BY NAME;
```

### 6. Database table and column discovery

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION AS COLUMN_ORDER,
       COLUMN_NAME, DATA_TYPE
FROM FANLYTICS_DB.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA IN ('PUBLIC_APP', 'READ_READY')
ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION;
```

## Using these queries in Node.js

Use the `query(sqlText, binds)` function from `src/config/snowflake.js` (as configured in our Node backend):

```js
import { query } from './config/snowflake.js'; // adjust relative path

const games = await query(`
  SELECT GAME_ID, HOME_TEAM, AWAY_TEAM, REVIEW_COUNT
  FROM FANLYTICS_DB.READ_READY.GAME_METRICS
  ORDER BY GAME_DATE DESC
  LIMIT 20
`);

const gameId = 1;
const sections = await query(`
  SELECT SECTION, COUNT(*) AS REVIEW_COUNT,
         ROUND(AVG(SECURITY_SCORE), 2) AS AVG_SECURITY
  FROM FANLYTICS_DB.READ_READY.REVIEWS_FACT
  WHERE GAME_ID = ?
  GROUP BY SECTION
`, [gameId]);
```

- Use `?` bind parameters for user-provided values. Never concatenate user input into SQL.
- Execute Snowflake queries **only on the backend**, not in the browser. Keep credentials in environment variables and exclude `.env` from Git.
- Return explicit columns from APIs rather than exposing sensitive fields (`PASSWORD_HASH`, raw ticket identifiers where unnecessary).
- For dashboard charts, prefer `READ_READY`; for ticket validation, prefer `PUBLIC_APP`.

## New review ingestion vs seeded reviews

The current intended application pipeline is:

```text
POST /api/reviews (Node.js)
  -> INGESTION.REVIEWS_IN (RAW_DATA VARIANT)
  -> INGESTION.REVIEWS_IN_STREAM
  -> TASK_ENRICH_REVIEWS
  -> ENRICHMENT.REVIEWS_ENRICHED
  -> ENRICHMENT.REVIEWS_ENRICHED_STREAM
  -> TASK_BUILD_READ_READY
  -> READ_READY.REVIEWS_FACT
  -> TASK_REFRESH_METRICS
  -> READ_READY.GAME_METRICS
```

`PUBLIC_APP.REVIEWS` is a separate table. Unless you add synchronization, new reviews arriving via ingestion **will not automatically be inserted into `PUBLIC_APP.REVIEWS`**. For fan-submitted reviews and dashboard analytics, use `READ_READY.REVIEWS_FACT` as the read source after the pipeline runs. The ingestion process is asynchronous, so results may not be visible immediately.

> **Caution for live demos:** The synthetic dataset may already include a review for every generated ticket. Use new unreviewed tickets to demonstrate form submission. Because standard Snowflake tables do not enforce `UNIQUE` keys, server-side existence checks alone are not fully race-safe for concurrent submissions.

## Notes / limitations

- The user-provided schema listing establishes names and types, not exact row counts, nullable settings, key enforcement, or data freshness.
- `TIMESTAMP_NTZ` is a timestamp **without time zone**; agree on a time convention in the backend.
- `LOGO_URL` values might be empty; the frontend should display a fallback logo.
- `GAME_METRICS` values reflect the most recent successful refresh; they can lag behind `REVIEWS_FACT`.
- The sample dataset is synthetic and must be labeled accordingly during presentation.

## Ticket reward fields

Run `backend/sql/rewards.sql` (or `npm run setup:rewards` in backend) to add `REWARD_ID VARCHAR(32)`, `REWARD_CODE VARCHAR(32)`, and `REWARD_SPUN_AT TIMESTAMP_TZ` to `PUBLIC_APP.TICKETS`. Existing values start NULL. The first conditional UPDATE where `REWARD_ID IS NULL` assigns the reward permanently; all retries read the saved result.
