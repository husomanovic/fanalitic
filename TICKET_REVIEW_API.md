# Check whether a fan can review a ticket

`GET /api/tickets/:ticketCode/eligibility` is public (no admin login required). URL-encode the ticket code. Codes are trimmed, must be 1–255 characters, and preserve leading zeros.

## Available ticket — HTTP 200

```json
{
  "can_review": true,
  "review_used": false,
  "reason": "AVAILABLE",
  "ticket": {
    "TICKET_ID": 7,
    "BARCODE": "ABC",
    "GAME_ID": 2,
    "HOME_TEAM": "Home team",
    "AWAY_TEAM": "Away team",
    "GAME_DATE": "2026-11-12T18:00:00",
    "SCORE_HOME": 2,
    "SCORE_GUEST": 1,
    "STADIUM": "Example stadium",
    "STADIUM_CITY": "Example city",
    "SECTION": "A",
    "ROW_NUMBER": "3",
    "SEAT_NUMBER": "12"
  }
}
```

Game date serialization follows the Snowflake driver; the source is TIMESTAMP_NTZ (no timezone). Do not assume the source represents UTC without agreeing on a warehouse convention.

## Used ticket — HTTP 200

Returns the same ticket information with `can_review: false`, `review_used: true`, and `reason: "ALREADY_REVIEWED"`. Hide the review form and show “This ticket has already been used for a review.”

A ticket counts as used if a matching review exists in **any** of:

- `PUBLIC_APP.REVIEWS` by ticket ID (the operational/seeded reviews table).
- `READ_READY.REVIEWS_FACT` by ticket ID or ticket code.
- `INGESTION.REVIEWS_IN` by `RAW_DATA:ticket_code` (legacy submissions awaiting pipeline processing; new reviews bypass this table).

A missing ticket returns HTTP 404 with `can_review: false`, `review_used: false`, `reason: "TICKET_NOT_FOUND"`, and `ticket: null`. Invalid codes return 400. Database failures return 500 with `can_review: false`; display a retry message, not “already used.” Responses use `Cache-Control: no-store`.

## Frontend example

```js
const response = await fetch(
  `/api/tickets/${encodeURIComponent(ticketCode.trim())}/eligibility`,
  { cache: 'no-store' }
);
const result = await response.json();
if (!response.ok) throw new Error(result.message || 'Unable to check ticket');
if (result.can_review) {
  // Display result.ticket.HOME_TEAM, AWAY_TEAM, GAME_DATE and the review form.
} else {
  // Display the already-reviewed message.
}
```

The original `GET /api/tickets/:ticketCode` still returns flat ticket fields plus `review_used` and now `can_review`.

`POST /api/reviews` repeats this check before inserting, so bypassing the eligibility page does not bypass the check. It returns 409 for a used ticket and 201 after the review is saved directly in `READ_READY.REVIEWS_FACT`. The row includes all seven scores, feedback, and ticket/game/stadium metadata joined from reference tables. New web submissions do not write ingestion JSON or wait for tasks. The check and insert are separate operations: concurrent submissions can still race on standard Snowflake tables. This is an eligibility check, not an atomic ticket reservation. Pending ingestion rows are treated as used even if enrichment later fails; resolution of failed ingestion requires an explicit operational process.

## Connected frontend

`/FANLYTICS` calls the eligibility endpoint before navigating to `/review/:ticketCode`. The review page checks eligibility again before displaying the form, so opening its URL directly also performs the check. Both pages require `can_review === true` and a ticket payload; malformed responses do not open the form. The form shows teams, stadium and game date from the returned ticket.

Next.js proxies `/api/*` to `BACKEND_URL`, falling back to `API_ORIGIN` for compatibility, then `http://localhost:5000`. Restart the frontend after changing proxy settings and restart the backend to load new routes.
