# Payment Reminder Feature — Design Spec
_Date: 2026-04-04_

## Overview

Add reminder functionality to the Admin Dashboard BOARD tab so admins can nudge unpaid players to pay. Supports email (functional) and text (UI-only placeholder). Available both per-player and as a bulk action for all unpaid players.

---

## UI

### Bulk Action Bar (`PaymentTracker`)

- Rendered between the summary stats grid and the progress bar when at least one unpaid player has an `owner_email`.
- Label: `REMIND UNPAID` with two buttons:
  - `✉ Email` — active, triggers send to all unpaid players with an email address
  - `💬 Text` — disabled/grayed out, shows "Coming soon" tooltip on hover
- While sending, the Email button shows a loading state (`Sending…`). On success, briefly shows `Sent ✓`.
- Matches existing button styling (small, uppercase, monospace/display font, dark surface aesthetic).

### Per-Player Buttons (`PlayerRow`)

- Shown in the PlayerRow header only for players with at least one unpaid square.
- Two small icon+label buttons: `✉ Email` and `💬 Text`.
- Positioned alongside existing action buttons (Confirm Payment / Mark All Paid).
- Email is active; Text is disabled with "Coming soon" tooltip.
- After a successful send, email button shows `✓` briefly before reverting.
- Hidden entirely for players who are fully paid.

---

## Backend

### New Edge Function: `send-reminder`

**File:** `supabase/functions/send-reminder/index.ts`

**Request body:**
```json
{ "square_ids": ["uuid", "uuid", ...] }
```

**Behavior:**
1. Fetch all squares matching the provided `square_ids` that are unpaid (`is_paid = false`) and have an `owner_email`.
2. Group squares by player (`player_token` or `owner_name` fallback).
3. For each unique player, send one email via Resend containing:
   - Board name
   - Number of squares owed and total dollar amount
   - Link to their personal player view (`/player/:playerToken`)
4. Return `{ results: [{ email, success, error? }] }`.

**Email content:**
- From: `Football Squares <joe@hagerman.dev>`
- Subject: `Reminder: You have unpaid squares in [Board Name]`
- Body: Hi [Name], you have [N] unpaid square(s) in [Board Name] totaling $[Amount]. [View your squares link]

**Does not:**
- Track reminder history in the DB (no new tables)
- Touch the existing `notify-winner` function
- Send SMS (Twilio wiring deferred)

### Frontend invocation

`supabase.functions.invoke('send-reminder', { body: { square_ids: [...] } })`

- Bulk: passes all unpaid square IDs across all players with emails
- Per-player: passes only that player's square IDs

---

## Constraints

- Text/SMS option is UI-only. Both buttons are always shown for visual consistency, but Text is disabled and non-functional.
- No new database tables required.
- Board and price data needed for the email are fetched inside the Edge Function via the service role client.
- The frontend passes only `square_ids`; the Edge Function resolves all other data server-side.
