# Payment Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email payment reminder buttons (per-player and bulk) to the Admin Dashboard BOARD tab, with a disabled text/SMS placeholder.

**Architecture:** A new Supabase Edge Function `send-reminder` handles server-side email delivery via Resend. The frontend invokes it from `PaymentTracker.jsx` — once from a bulk bar at the top of the tracker (all unpaid players), and once per player from each `PlayerRow` header. The Text button is rendered but disabled in both locations.

**Tech Stack:** React, Supabase JS client (`supabase.functions.invoke`), Supabase Edge Functions (Deno), Resend API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/send-reminder/index.ts` | Edge Function — accepts `{ square_ids, base_url }`, fetches player/board data, sends one Resend email per unique player |
| Modify | `src/components/PaymentTracker.jsx` | Add bulk reminder bar (between stats and progress bar); add per-player `[✉ Email] [💬 Text]` buttons in `PlayerRow` header |

---

## Task 1: Create the `send-reminder` Edge Function

**Files:**
- Create: `supabase/functions/send-reminder/index.ts`

This function:
1. Accepts `{ square_ids: string[], base_url: string }`
2. Fetches all matching squares that are unpaid and have an email
3. Groups by player token (falls back to owner_name)
4. Fetches the board from the first square's `board_id`
5. Sends one Resend email per player group
6. Returns `{ results: [{ email, success, error? }] }`

- [ ] **Step 1: Create the Edge Function file**

Create `supabase/functions/send-reminder/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { square_ids, base_url } = await req.json()

    if (!square_ids || !Array.isArray(square_ids) || square_ids.length === 0) {
      return new Response('square_ids required', { status: 400, headers: corsHeaders })
    }

    // Fetch all provided squares that are unpaid and have an email
    const { data: squares, error: sqErr } = await supabase
      .from('squares')
      .select('*')
      .in('id', square_ids)
      .eq('is_paid', false)
      .not('owner_email', 'is', null)

    if (sqErr) throw sqErr
    if (!squares || squares.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch board from first square
    const boardId = squares[0].board_id
    const { data: board, error: bErr } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (bErr || !board) throw bErr ?? new Error('Board not found')

    // Group squares by player
    const playerMap: Record<string, { squares: typeof squares; name: string; email: string; token: string }> = {}
    for (const sq of squares) {
      const key = sq.player_token ?? sq.owner_name
      if (!playerMap[key]) {
        playerMap[key] = { squares: [], name: sq.owner_name, email: sq.owner_email, token: sq.player_token }
      }
      playerMap[key].squares.push(sq)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const player of Object.values(playerMap)) {
      const count = player.squares.length
      const total = count * board.price_per_square
      const playerUrl = base_url ? `${base_url}/player/${player.token}` : null

      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#ca8a04">Payment Reminder</h2>
          <p>Hi ${player.name},</p>
          <p>You have <strong>${count} unpaid square${count !== 1 ? 's' : ''}</strong> in <strong>${board.name}</strong> totaling <strong>$${total}</strong>.</p>
          <p>Please send payment to the board organizer at your earliest convenience.</p>
          ${playerUrl ? `<p><a href="${playerUrl}" style="color:#ca8a04">View your squares →</a></p>` : ''}
          <p style="color:#6b7280;font-size:13px">This is a reminder from the ${board.name} football squares pool.</p>
        </div>
      `

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Football Squares <joe@hagerman.dev>',
          to: [player.email],
          subject: `Reminder: You have unpaid squares in ${board.name}`,
          html,
        }),
      })

      if (emailRes.ok) {
        results.push({ email: player.email, success: true })
      } else {
        results.push({ email: player.email, success: false, error: await emailRes.text() })
      }
    }

    const hasErrors = results.some((r) => !r.success)
    return new Response(JSON.stringify({ results }), {
      status: hasErrors ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err), { status: 500, headers: corsHeaders })
  }
})
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
cd C:\Users\joemh\code\squares
npx supabase functions deploy send-reminder
```

Expected output: `Deployed send-reminder`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-reminder/index.ts
git commit -m "feat: add send-reminder edge function for payment reminder emails"
```

---

## Task 2: Add bulk reminder bar to `PaymentTracker`

**Files:**
- Modify: `src/components/PaymentTracker.jsx`

The bulk bar sits between the summary stats grid and the progress bar. It only renders when at least one unpaid player has an `owner_email`. It has two buttons: Email (active) and Text (disabled). On click, it collects all unpaid square IDs from players with emails and calls the Edge Function.

- [ ] **Step 1: Add `remindingAll` and `remindAllSent` state to `PaymentTracker`**

At the top of the `PaymentTracker` function body, after the existing derived values, add:

```jsx
const [remindingAll, setRemindingAll] = useState(false)
const [remindAllSent, setRemindAllSent] = useState(false)
```

- [ ] **Step 2: Add the `sendBulkReminder` function**

Add this function inside `PaymentTracker`, after the state declarations:

```jsx
async function sendBulkReminder() {
  setRemindingAll(true)
  const unpaidWithEmail = claimed.filter((s) => !s.is_paid && s.owner_email)
  const ids = unpaidWithEmail.map((s) => s.id)
  await supabase.functions.invoke('send-reminder', {
    body: { square_ids: ids, base_url: window.location.origin },
  })
  setRemindingAll(false)
  setRemindAllSent(true)
  setTimeout(() => setRemindAllSent(false), 3000)
}
```

- [ ] **Step 3: Add the bulk reminder bar JSX**

Replace the progress bar block in `PaymentTracker`'s return. Currently it reads:

```jsx
      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--sq-alpha),0.07)' }}>
```

Replace with:

```jsx
      {/* Bulk reminder bar */}
      {claimed.some((s) => !s.is_paid && s.owner_email) && (
        <div className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: 'rgba(var(--sq-accent-rgb),0.06)', border: '1px solid rgba(var(--sq-accent-rgb),0.12)' }}>
          <span className="font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase">Remind Unpaid</span>
          <div className="flex gap-2">
            <button
              onClick={sendBulkReminder}
              disabled={remindingAll || remindAllSent}
              className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-60"
              style={{ background: 'rgba(var(--sq-accent-rgb),0.12)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.25)' }}
            >
              {remindingAll ? 'Sending…' : remindAllSent ? 'Sent ✓' : '✉ Email'}
            </button>
            <div className="relative group/text">
              <button
                disabled
                className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm cursor-not-allowed"
                style={{ background: 'rgba(var(--sq-alpha),0.04)', color: 'rgba(var(--sq-alpha),0.2)', border: '1px solid rgba(var(--sq-alpha),0.08)' }}
              >
                💬 Text
              </button>
              <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 rounded-sm font-mono text-[10px] opacity-0 group-hover/text:opacity-100 transition-opacity whitespace-nowrap"
                style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.6)' }}>
                Coming soon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--sq-alpha),0.07)' }}>
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`, open the admin dashboard for a board with unpaid players. Confirm the reminder bar appears between the stats and the progress bar. Confirm Email button triggers a loading state. Confirm Text button shows "Coming soon" tooltip on hover.

- [ ] **Step 5: Commit**

```bash
git add src/components/PaymentTracker.jsx
git commit -m "feat: add bulk remind-unpaid bar to PaymentTracker"
```

---

## Task 3: Add per-player reminder buttons to `PlayerRow`

**Files:**
- Modify: `src/components/PaymentTracker.jsx` (the `PlayerRow` function)

The `PlayerRow` header already has action buttons on the right side. For players with any unpaid squares, add `✉ Email` and `💬 Text` buttons before the existing action buttons. Email invokes the Edge Function with just this player's unpaid square IDs.

- [ ] **Step 1: Add `remindingEmail` and `remindSent` state to `PlayerRow`**

Inside the `PlayerRow` function, after the existing state declarations (`expanded`, `toggling`), add:

```jsx
const [remindingEmail, setRemindingEmail] = useState(false)
const [remindSent, setRemindSent] = useState(false)
```

- [ ] **Step 2: Add `sendPlayerReminder` function**

Add inside `PlayerRow` after the state declarations:

```jsx
async function sendPlayerReminder() {
  setRemindingEmail(true)
  const ids = player.squares.filter((s) => !s.is_paid).map((s) => s.id)
  await supabase.functions.invoke('send-reminder', {
    body: { square_ids: ids, base_url: window.location.origin },
  })
  setRemindingEmail(false)
  setRemindSent(true)
  setTimeout(() => setRemindSent(false), 3000)
}
```

- [ ] **Step 3: Add reminder buttons to the PlayerRow header JSX**

In `PlayerRow`'s return, find the `<div className="flex items-center gap-2 flex-shrink-0">` that wraps the right-side action buttons. Add the reminder buttons as the first children inside that div, before the existing `{hasPending && ...}` block:

```jsx
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Reminder buttons — only for players with unpaid squares and an email */}
          {!allPaid && player.email && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); sendPlayerReminder() }}
                disabled={remindingEmail || remindSent}
                className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm transition-all disabled:opacity-60"
                style={{ background: 'rgba(var(--sq-accent-rgb),0.1)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)' }}
              >
                {remindingEmail ? '…' : remindSent ? '✓' : '✉'}
              </button>
              <div className="relative group/textbtn">
                <button
                  disabled
                  className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm cursor-not-allowed"
                  style={{ background: 'rgba(var(--sq-alpha),0.04)', color: 'rgba(var(--sq-alpha),0.2)', border: '1px solid rgba(var(--sq-alpha),0.08)' }}
                >
                  💬
                </button>
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 rounded-sm font-mono text-[10px] opacity-0 group-hover/textbtn:opacity-100 transition-opacity whitespace-nowrap z-10"
                  style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.6)' }}>
                  Coming soon
                </span>
              </div>
            </>
          )}
          {/* existing buttons below — hasPending, toggleAll, etc. */}
```

- [ ] **Step 4: Verify in browser**

Reload the admin dashboard. On the BOARD tab, expand or look at unpaid player rows. Confirm `✉` and `💬` buttons appear for unpaid players. Confirm `✉` shows a loading indicator and then `✓` after invocation. Confirm `💬` shows "Coming soon" tooltip. Confirm fully-paid players do NOT show the buttons.

- [ ] **Step 5: Commit**

```bash
git add src/components/PaymentTracker.jsx
git commit -m "feat: add per-player reminder buttons to PlayerRow"
```
