# Football Squares — Agent Context

> Read this at the start of every session. It captures decisions, schema state, and conventions that are not obvious from the code alone.

---

## What This App Is

A web app for running football squares pools. Two audiences:
- **Admin (commissioner)** — creates boards, manages payments, enters scores, notifies winners
- **Player** — claims squares, views their personal board, receives winner notifications

No login required for players — they're identified by a unique `player_token` UUID in their personal link (`/player/:playerToken`). Admin auth is planned but not yet implemented (issue #9).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 (uses `@import "tailwindcss"` syntax, NOT `@tailwind` directives) |
| Backend / DB | Supabase (Postgres + real-time + Edge Functions) |
| Hosting | AWS Amplify |
| SMS | Twilio (via Supabase Edge Function only — never client-side) |
| Email | Resend (via Supabase Edge Function only — never client-side) |
| QR Codes | qrcode.react |
| NFL Schedule | ESPN public API (no key required) |

---

## CSS / Styling Notes

- Tailwind v4 is in use. The import order in `src/index.css` matters: Google Fonts `@import url(...)` must come **before** `@import "tailwindcss"` or PostCSS throws an error.
- Custom fonts: `Oswald` (display/headings, class `font-display`) and `IBM Plex Mono` (mono, class `font-mono`).
- Design language: dark background (`#07070e`), amber accent (`#f59e0b`), uppercase Oswald headings, IBM Plex Mono for labels/data.
- Custom utility classes defined in `index.css`: `.dot-grid`, `.animate-pulse-dot`, `.animate-slide-up` through `.animate-slide-up-5`.

---

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `Home` | Create a Board button only (Join a Board was removed — issue #10) |
| `/create` | `CreateBoard` | Full board setup form |
| `/board/:boardId` | `BoardView` | Live board, public |
| `/board/:boardId/admin` | `AdminDashboard` | Tabs: Board, Payments, Game Day |
| `/board/:boardId/join` | `JoinFlow` | Player claiming flow |
| `/player/:playerToken` | `PlayerView` | Player's personal squares |
| `/board/:boardId/print` | `PrintableBoard` | Printer-friendly layout |

---

## Database Schema (current state)

All migrations have been applied. This reflects the full current schema including all additions made during development.

```sql
-- Boards
create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_id text not null,
  home_team text not null,
  away_team text not null,
  price_per_square numeric not null default 10,
  payout_q1 numeric,
  payout_q2 numeric,
  payout_q3 numeric,
  payout_q4 numeric,
  payout_final numeric,
  payout_reverse_q1 numeric,       -- reverse payout per moment
  payout_reverse_q2 numeric,
  payout_reverse_q3 numeric,
  payout_reverse_q4 numeric,
  payout_reverse_final numeric,
  scoring_moments text[] not null default '{Q1,Q2,Q3,Q4,Final}',
  status text not null default 'open',  -- open | locked | complete
  rotate_numbers boolean not null default false,
  row_numbers int[],               -- standard mode: single shuffle assigned on lock
  col_numbers int[],
  row_numbers_rotated jsonb,       -- rotating mode: {"Q1":[...],"Q2":[...],...}
  col_numbers_rotated jsonb,
  created_at timestamptz default now()
);

-- Board admins
create table board_admins (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  email text not null,
  name text not null,
  phone text,                      -- optional
  created_at timestamptz default now()
);

-- Squares (100 per board, pre-seeded on creation)
create table squares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  row_index int not null,
  col_index int not null,
  owner_name text,
  display_name text,               -- optional short name shown in grid cells; falls back to initials
  owner_email text,
  owner_phone text,
  is_paid boolean default false,
  claimed_at timestamptz,
  player_token uuid default gen_random_uuid(),
  unique(board_id, row_index, col_index)
);

-- Score updates
create table score_updates (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  moment text not null,
  home_score int not null,
  away_score int not null,
  entered_at timestamptz default now()
);

-- Winners (one primary + optionally one reverse per scoring moment)
create table winners (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  square_id uuid references squares(id),
  moment text not null,
  home_score int not null,
  away_score int not null,
  payout numeric,
  is_reverse boolean not null default false,
  notified_at timestamptz,         -- legacy; notification history now in winner_notifications
  created_at timestamptz default now()
);

-- Notification history (replaces single notified_at timestamp on winners)
create table winner_notifications (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid references winners(id) on delete cascade,
  method text not null,            -- 'email' | 'sms'
  sent_at timestamptz default now(),
  success boolean not null default true,
  error_message text
);
```

---

## Key Architectural Decisions

### Rotating Numbers (#1)
When `rotate_numbers = true` on a board, locking generates one independent 0–9 shuffle per scoring moment. Stored as JSONB (`row_numbers_rotated`, `col_numbers_rotated`) keyed by moment name (e.g. `{"Q1":[3,7,2...],"Q2":[...]}`). Standard (non-rotating) boards use the flat `row_numbers`/`col_numbers` int arrays as before.

`SquaresGrid` has two render paths — check the `rotateNumbers` prop. When rotating, the grid renders N header rows (col numbers) and N header columns (row numbers), one per scoring moment, with quarter labels on the diagonal in the corner.

`lockBoard(boardId, { rotateNumbers, scoringMoments })` in `src/lib/board.js` — always pass both options from AdminDashboard.

`ScoreEntry` detects rotating mode via `board.rotate_numbers` and looks up the correct quarter's number arrays when finding the winning square.

### Reverse Payout (#5)
Stored as separate `payout_reverse_*` columns on `boards`. When a score is submitted with a reverse payout configured AND the digits differ (home ≠ away last digit), a second winner row is inserted with `is_reverse = true`. Shown separately in the Game Day tab as "Reverse" below the primary winner.

### Notifications (#7)
**No auto-notify.** The database webhook trigger for `notify-winner` was removed. Notifications are triggered manually from the Game Day tab via Email/SMS buttons per winner.

The Edge Function (`supabase/functions/notify-winner/index.ts`) is invoked directly from the client:
```js
supabase.functions.invoke('notify-winner', { body: { winner_id, method } })
// method: 'email' | 'sms' | 'both'
```

The function requires CORS headers — they are present. If you see "Failed to send a request to the Edge Function", the function likely needs to be redeployed: `npx supabase functions deploy notify-winner`.

Notification history is written to `winner_notifications` by the Edge Function and displayed per winner in the UI.

### Payment Tracking
`onSquareUpdated` in `AdminDashboard` uses the **functional updater** form of `setSquares` (`setSquares((prev) => ...)`) to avoid stale closure issues when the real-time subscription and the callback fire close together.

---

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Edge Function secrets (set in Supabase dashboard, not in `.env`):
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
RESEND_API_KEY
```

---

## NFL / Team Data

`src/lib/nfl.js` fetches from ESPN's public scoreboard API. Returns current week's games. `getTeamLogoUrl(teamName)` maps full team names to ESPN CDN logo URLs. Issue #8 (college football support) would extend this file.

---

## Open Issues

See `ISSUES.md`. As of last session:
- **#8** — College football team support
- **#9** — Admin auth (Supabase Auth); player access already uses `player_token` links
- **#11** — Donations (Venmo / Cash App)
