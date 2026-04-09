# Football Squares — Full App Plan

> Hand this file to Claude Code at the start of each session:
> *"Refer to PLAN.md for the full spec. We are on Stage X."*

---

## Overview

A web application for running football squares pools. Two distinct experiences:
- **Admin Dashboard** — create boards, manage players, track payments, enter scores
- **Player View** — claim squares, view personal QR code, watch live board during game day

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Fast, modern |
| Styling | Tailwind CSS | Utility-first |
| Backend / DB | Supabase | Hosted Postgres + auth + real-time |
| Hosting | AWS Amplify | Free tier, free subdomain, deploys from GitHub |
| SMS | Twilio | Winner notifications |
| Email | Resend | Winner notifications, free tier (3k/mo) |
| QR Codes | qrcode.react | Client-side generation |
| NFL Schedule | ESPN public API | Free, no key required |

---

## Project Structure

```
football-squares/
├── src/
│   ├── pages/
│   │   ├── Home.jsx              # Create or find a board
│   │   ├── AdminDashboard.jsx    # Manage board, payments, scores
│   │   ├── BoardView.jsx         # Live board — players + admins
│   │   └── PlayerView.jsx        # Personal squares + player QR
│   ├── components/
│   │   ├── SquaresGrid.jsx       # The 10x10 board
│   │   ├── PaymentTracker.jsx    # Admin payment dashboard
│   │   ├── ScoreEntry.jsx        # Admin score input
│   │   ├── QRCodeDisplay.jsx     # Reusable QR component
│   │   └── WinnerBanner.jsx      # In-app winner notification
│   ├── lib/
│   │   ├── supabase.js           # Supabase client
│   │   ├── notifications.js      # SMS + email helpers
│   │   └── nfl.js                # ESPN API helpers
├── .env                          # Supabase + Twilio + Resend keys
├── PLAN.md                       # This file
```

---

## Database Schema (Supabase / Postgres)

Run this SQL in the Supabase SQL Editor to create all tables:

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
  scoring_moments text[] not null default '{Q1,Q2,Q3,Q4,Final}',
  status text not null default 'open',  -- open | locked | complete
  row_numbers int[],   -- randomly assigned 0-9 for rows (set on lock)
  col_numbers int[],   -- randomly assigned 0-9 for cols (set on lock)
  created_at timestamptz default now()
);

-- Board admins (multiple per board)
create table board_admins (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  email text not null,
  name text not null,
  created_at timestamptz default now()
);

-- Squares (100 per board, pre-seeded on board creation)
create table squares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  row_index int not null,         -- 0–9
  col_index int not null,         -- 0–9
  owner_name text,
  owner_email text,
  owner_phone text,
  is_paid boolean default false,
  claimed_at timestamptz,
  player_token uuid default gen_random_uuid(),  -- unique token for player's personal link
  unique(board_id, row_index, col_index)
);

-- Score updates (entered manually by admin)
create table score_updates (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  moment text not null,           -- Q1, Q2, Q3, Q4, Final
  home_score int not null,
  away_score int not null,
  entered_at timestamptz default now()
);

-- Winners (one per scoring moment)
create table winners (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  square_id uuid references squares(id),
  moment text not null,
  home_score int not null,
  away_score int not null,
  payout numeric,
  notified_at timestamptz,
  created_at timestamptz default now()
);
```

---

## Core Features & Rules

### Board Creation (Admin)
- Admin enters: board name, NFL game (picked from ESPN schedule), price per square, payout per scoring moment, which scoring moments are active (Q1/Q2/Q3/Q4/Final — any combo)
- Multiple admins can be added per board by email
- On creation, 100 squares are pre-seeded (10x10) in the `squares` table with no owner

### Claiming Squares (Player)
- Player arrives via shareable join link or QR code
- Enters name, email, phone number
- Can either:
  - **Pick specific squares** by tapping on the grid
  - **Request random assignment** — app picks unclaimed squares randomly
- No limit on how many squares one player can claim
- Player receives a unique personal link (via `player_token`) to their player view

### Board Lock & Number Reveal
- Board auto-locks when all 100 squares are filled
- On lock: 0–9 is randomly shuffled and assigned to both row and column axes
- `row_numbers` and `col_numbers` arrays saved to the `boards` table
- All players notified at lock time

### Payment Tracking (Admin)
- Admin dashboard shows all 100 squares with owner name, email, phone, paid/unpaid status
- Admin can tap/click any square to toggle paid status
- Summary shows: total collected vs. total owed across entire board

### Game Day — Score Entry
- Admin manually enters home/away scores at each configured scoring moment
- App identifies the winning square: last digit of home score = column number, last digit of away score = row number
- Winning square is highlighted on the live board
- Winner record saved to `winners` table

### Winner Notifications
Winners are notified simultaneously via:
1. **SMS** (Twilio) — text to `owner_phone`
2. **Email** (Resend) — sent to `owner_email`
3. **In-app banner** — shown on the live `BoardView` via Supabase real-time

### QR Codes

| QR Code | Who uses it | Purpose |
|---|---|---|
| Board join QR | Admin shares/prints | Players scan to claim squares |
| Player personal QR | Each player | Proof of their squares on game day |
| Printable board QR | Posted physically | Anyone scans to view live board |

- All QR codes generated client-side with `qrcode.react`
- Printable board view should be a clean, printer-friendly layout with the QR embedded

---

## Routes

| Path | Component | Who sees it |
|---|---|---|
| `/` | `Home` | Everyone — create or find a board |
| `/board/:boardId` | `BoardView` | Everyone — live board view |
| `/board/:boardId/admin` | `AdminDashboard` | Admins only |
| `/board/:boardId/join` | `JoinFlow` | Players joining via link/QR |
| `/player/:playerToken` | `PlayerView` | Individual player — their squares + QR |
| `/board/:boardId/print` | `PrintableBoard` | Printer-friendly board + QR |

---

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TWILIO_ACCOUNT_SID=       # Used server-side only (Supabase Edge Function)
VITE_TWILIO_AUTH_TOKEN=        # Used server-side only
VITE_TWILIO_FROM_NUMBER=       # Used server-side only
VITE_RESEND_API_KEY=           # Used server-side only (Supabase Edge Function)
```

> **Note:** Twilio and Resend keys should only be used in Supabase Edge Functions, never exposed to the client.

---

## Build Stages

Work through these in order. Each stage produces something functional.

### Stage 1 — Foundation ✅
- Vite + React + Tailwind setup
- Supabase project created
- All database tables created
- Basic routing scaffolded
- Home page renders

### Stage 2 — Board Creation
- Admin can create a board (name, NFL game picker via ESPN API, price, payouts, scoring moments)
- Co-admin invite by email
- Board record saved to Supabase
- 100 squares pre-seeded on creation
- Admin receives board admin link

### Stage 3 — Player Claiming
- Join link and QR code generated for the board
- Player enters name, email, phone
- Player can pick squares or request random assignment
- Squares update in real-time on the grid
- Player receives unique personal link after claiming

### Stage 4 — Board Lock & Number Reveal
- Board auto-locks when all 100 squares are filled (triggered via Supabase)
- 0–9 randomly assigned to both axes
- Numbers revealed on the board
- All players notified (SMS + email)

### Stage 5 — QR Codes
- Board join QR on admin dashboard (shareable/downloadable)
- Player personal QR on player view
- Printable board page with embedded QR

### Stage 6 — Payment Tracking
- Admin payment dashboard: all players, paid/unpaid toggle per square
- Running totals: collected vs. owed
- Visual indicators on the grid (e.g., color-coded by paid status)

### Stage 7 — Game Day (Score Entry + Winner Detection)
- Admin score entry UI for each configured scoring moment
- Winning square calculated and highlighted on live board
- Winner record saved
- Supabase real-time pushes board updates to all connected players

### Stage 8 — Notifications
- Supabase Edge Functions for Twilio SMS and Resend email
- Triggered on winner record creation
- In-app winner banner via Supabase real-time subscription

### Stage 9 — Deploy
- Push to GitHub
- Connect repo to AWS Amplify
- Set environment variables in Amplify console
- Live on free Amplify subdomain

---

## Key Technical Notes

- **Player auth:** No login required for players. Each player is identified by a unique `player_token` UUID stored in the `squares` table. Their personal link is `/player/:playerToken`.
- **Admin auth:** Admins authenticate via Supabase Auth (email/password or magic link). Board admin access is checked via the `board_admins` table.
- **Real-time:** Use Supabase real-time subscriptions on the `squares`, `score_updates`, and `winners` tables to keep the board live.
- **SMS/Email:** Never call Twilio or Resend directly from the client. Use Supabase Edge Functions triggered by database webhooks or direct invocation.
- **NFL schedule:** ESPN public endpoint — `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` — returns current week's games. No API key required.
- **QR codes:** Use `qrcode.react` for client-side generation. Pass the full URL as the value.
- **Board seeding:** When a board is created, immediately insert 100 rows into `squares` (row_index 0–9 × col_index 0–9) with no owner data.
