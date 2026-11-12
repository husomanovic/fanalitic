<style>
  h1, h2,
  .vscode-light h1, .vscode-light h2,
  .vscode-dark h1, .vscode-dark h2,
  .vscode-high-contrast h1, .vscode-high-contrast h2 {
    border-bottom: none !important;
  }
</style>

<img src="frontend/public/logo-readme.png" alt="FanAnalitic logo" width="100%" />

# FanAnalitic

FanAnalitic collects what supporters actually felt at a match, then turns those answers into statistics and conclusions.

A fan does not create an account. The ticket already carries a QR code. Scanning it opens a short form for that specific match. The fan rates the experience and leaves a short comment. Each ticket can be used once. From those responses we can see how a match, a stadium, or a club is experienced: security, comfort, organisation, how family-friendly it felt, and the overall impression.

## How it works

1. A ticket is issued for a game and stores a barcode, which is printed as a QR code.
2. During the match the fan scans the code and lands on a simple form tied to that ticket and that game.
3. The form asks for scores and a short written impression.
4. The answer is stored as one review. The ticket is marked as already used, so the same code cannot be submitted again.
5. Reviews are aggregated in Snowflake into statistics and conclusions across games, teams, and stadiums.

Staff use a separate admin panel on the same Next.js app. They sign in with email and password. Passwords are hashed with bcryptjs, and each session is verified with a JWT. From the panel they follow analytics and manage the catalog: teams, stadiums, games, and the rest of the match data.

## Stack

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th align="left" style="border: 1px solid #888; padding: 8px 12px;">Part</th>
      <th align="left" style="border: 1px solid #888; padding: 8px 12px;">Technology</th>
      <th align="left" style="border: 1px solid #888; padding: 8px 12px;">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #888; padding: 8px 12px;">Frontend (Web app)</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Next.js</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Fan form from the QR code, and the admin panel</td>
    </tr>
    <tr>
      <td style="border: 1px solid #888; padding: 8px 12px;">Backend</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Express.js</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Tickets, reviews, games, and admin actions</td>
    </tr>
    <tr>
      <td style="border: 1px solid #888; padding: 8px 12px;">Auth</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">JWT, bcryptjs</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Login verification and password hashing for admin users</td>
    </tr>
    <tr>
      <td style="border: 1px solid #888; padding: 8px 12px;">Warehouse</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Snowflake</td>
      <td style="border: 1px solid #888; padding: 8px 12px;">Storage and analysis of review data</td>
    </tr>
  </tbody>
</table>

## Starting data model

Fans are not a user account: a review hangs off a ticket. `USERS` holds admin accounts and is not linked to reviews.

```mermaid
erDiagram
    USERS {
        int ID PK
        string EMAIL
        string NAME
        string PASSWORD
        string ROLE
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    TEAMS {
        int ID PK
        string NAME
        string LOGO_PHOTO
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    STADIUMS {
        int ID PK
        string CITY
        string COUNTRY
        int CAPACITY
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    GAMES {
        int ID PK
        int HOME_TEAM_ID FK
        int GUEST_TEAM_ID FK
        int STADIUM_ID FK
        string TIME
        date DATE
        int SCORE_HOME
        int SCORE_GUEST
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    TICKETS {
        int ID PK
        int GAME_ID FK
        string SEAT
        decimal PRICE
        string BARCODE
        boolean REVIEW_USED
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    REVIEWS {
        int ID PK
        int TICKET_ID FK
        int ORGANISATION_SCORE
        int SECURITY_SCORE
        int COMFORT_SCORE
        int EXPERIENCE_SCORE
        int GAME_EXPERIENCE_SCORE
        int FAMILY_FRIENDLY_SCORE
        int OVERALL_SCORE
        string FEEDBACK_TEXT
        timestamp CREATED_AT
        timestamp UPDATED_AT
    }

    TEAMS ||--o{ GAMES : "home showdown"
    TEAMS ||--o{ GAMES : "guest showdown"
    STADIUMS ||--o{ GAMES : "hosts"
    GAMES ||--o{ TICKETS : "has"
    TICKETS ||--o| REVIEWS : "one review"
```

## Repository

```
FanAnalitic/
  frontend/     Next.js app
  backend/      Express API
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
```

## Dashboard API

See [Visualization and endpoint guide](./VISUALISATION_INTRO.md) for the implemented analytics routes, filters, response contracts, and recommended charts. [Snowflake schema](./SNOWFLAKE_SCHEMA.md) describes the warehouse sources.

Start the API with `cd backend`, `npm install`, then `npm run dev` after configuring Snowflake credentials in `backend/.env`. Run backend checks with `npm test`.

## Registration and admin authentication

Anyone can register at `/register` and receive access to the admin panel. The login
page includes a registration link. Registration stores a bcrypt hash (cost 12),
then asks the new user to sign in. Passwords must contain at least 12 characters
and fit within bcrypt's 72-byte UTF-8 limit. Passwords are never stored as plaintext.

The Express backend verifies credentials and issues an eight-hour JWT in an
HTTP-only, SameSite=Lax cookie (Secure in production). Every authenticated API
request verifies the JWT and the corresponding unexpired database session. Logout
revokes that session immediately. `/admin` verifies the session on the server;
analytics endpoints require the same admin authorization. The ticket and fan
review endpoints remain public.

### Local setup

Use Node.js 22.19 or later. From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `JWT_SECRET` in `backend/.env`, then fill in the
`SNOWFLAKE_*` settings. Do not commit `.env`. The frontend uses port 3000 and the
backend uses port 5000. `FRONTEND_ORIGIN` must exactly match the browser's origin.
If your API runs elsewhere, set `BACKEND_URL` in `frontend/.env.local` and restart
Next.js. Keep that address server-only.

Install and initialize the backend:

```powershell
cd backend
npm ci
npm run setup:auth
npm run dev
```

`setup:auth` runs `backend/sql/auth.sql` in the configured Snowflake database. It
creates `PUBLIC_APP.ADMIN_USERS` and `PUBLIC_APP.ADMIN_SESSIONS` without replacing
existing tables. These are standard tables compatible with Snowflake trial accounts.
Their UNIQUE and foreign key constraints are informational, so the backend serializes
registration per email and refuses ambiguous account/session records. Run only one
backend writer instance; multiple instances or external account writers require a
transactional database with enforced uniqueness (for example, Snowflake hybrid tables
on an eligible account). The setup role needs schema/table creation permissions. The runtime
role needs SELECT/INSERT access to these tables and DELETE access to sessions.
The README's earlier `USERS` diagram is conceptual; authentication uses these
explicit admin tables.

In another terminal, from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000/register`, create an account, then sign in at `/login`.
Successful sign-in opens `/admin`; the Sign out button ends the session.

### Deployment and verification

Serve the site over HTTPS, set `NODE_ENV=production`, and set `FRONTEND_ORIGIN`
to the site's exact HTTPS origin. The browser uses same-origin `/api/*` requests,
which Next.js proxies to `BACKEND_URL`. Only trust the actual reverse proxy in
`TRUST_PROXY`; the default `loopback` is intended for local Next.js. The reverse
proxy must overwrite untrusted forwarded IP headers. The authentication attempt
limit is 20 requests per IP per 15 minutes, shared by login and registration. Its
memory store is per backend process; multiple instances require a shared store.

Run `npm test` in `backend` for authentication tests (an isolated test store, no
Snowflake access), and `npm run build` in `frontend` to check production compilation.
Database setup and live Snowflake integration require your own credentials.
Expired session records can periodically be removed with:

```sql
DELETE FROM PUBLIC_APP.ADMIN_SESSIONS WHERE EXPIRES_AT <= CURRENT_TIMESTAMP();
```
