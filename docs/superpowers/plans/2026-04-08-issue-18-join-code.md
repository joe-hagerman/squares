# Issue #18: Join Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a short join code to every board so players can enter it on the home page to jump straight to the join flow, and admins/players can see the code in every board header.

**Architecture:** A `join_code` TEXT column (6 uppercase alphanumeric chars) is added to the `boards` table. Code generation lives in `src/lib/board.js`. `CreateBoard.jsx` generates and persists the code on insert. `Home.jsx` gains an inline lookup form — user enters code, app resolves it to a board UUID and navigates to the join flow. All board headers (AdminDashboard, BoardView, PlayerView) display the join code as a tappable pill that copies to clipboard.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, Supabase JS v2, react-router-dom v7

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260408000000_add_join_code.sql` | Create | Add `join_code` column; backfill existing rows |
| `src/lib/board.js` | Modify | Add `generateJoinCode()` and `getBoardByJoinCode(code)` |
| `src/pages/CreateBoard.jsx` | Modify | Generate + persist join code on board insert |
| `src/pages/Home.jsx` | Modify | Add join-code entry form |
| `src/pages/AdminDashboard.jsx` | Modify | Display join code pill in header |
| `src/pages/BoardView.jsx` | Modify | Display join code pill in header |
| `src/pages/PlayerView.jsx` | Modify | Display join code pill in header |

---

## Task 1: Database — add join_code column

**Files:**
- Create: `supabase/migrations/20260408000000_add_join_code.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260408000000_add_join_code.sql` with:

```sql
-- Add join_code column (nullable first so we can backfill existing rows)
ALTER TABLE boards ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Backfill existing boards with a 6-char uppercase hex code derived from their ID.
-- New boards will get proper alphanumeric codes from the JS layer.
UPDATE boards
SET join_code = upper(left(md5(id::text), 6))
WHERE join_code IS NULL;

-- Now lock it down
ALTER TABLE boards ALTER COLUMN join_code SET NOT NULL;
ALTER TABLE boards ADD CONSTRAINT boards_join_code_unique UNIQUE (join_code);
```

- [ ] **Step 2: Run the migration**

Apply via the Supabase CLI:
```bash
npx supabase db push
```

Or paste the SQL into the Supabase dashboard → SQL Editor and run it.

Expected: no errors; `\d boards` or the Table Editor shows the new `join_code` column.

- [ ] **Step 3: Verify the column exists**

In the Supabase SQL Editor run:
```sql
SELECT id, name, join_code FROM boards LIMIT 5;
```

Expected: each row has a 6-char uppercase join_code (e.g. `"A3F7B2"`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260408000000_add_join_code.sql
git commit -m "feat: add join_code column to boards"
```

---

## Task 2: Add join code utilities to board.js

**Files:**
- Modify: `src/lib/board.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/board.test.js`:

```js
import { generateJoinCode } from '../board'

test('generateJoinCode returns a 6-char uppercase alphanumeric string', () => {
  const code = generateJoinCode()
  expect(code).toHaveLength(6)
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
})

test('generateJoinCode produces unique codes', () => {
  const codes = new Set(Array.from({ length: 1000 }, generateJoinCode))
  expect(codes.size).toBeGreaterThan(990)
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/lib/__tests__/board.test.js
```

Expected: FAIL — `generateJoinCode is not a function`

- [ ] **Step 3: Implement generateJoinCode and getBoardByJoinCode in board.js**

Add to the bottom of `src/lib/board.js`:

```js
const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateJoinCode() {
  return Array.from(
    { length: 6 },
    () => JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]
  ).join('')
}

export async function getBoardByJoinCode(code) {
  const { data, error } = await supabase
    .from('boards')
    .select('id')
    .eq('join_code', code.toUpperCase().trim())
    .single()
  if (error) return null
  return data.id
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/lib/__tests__/board.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/board.js src/lib/__tests__/board.test.js
git commit -m "feat: add generateJoinCode and getBoardByJoinCode to board lib"
```

---

## Task 3: Generate and persist join code on board creation

**Files:**
- Modify: `src/pages/CreateBoard.jsx`

- [ ] **Step 1: Import generateJoinCode**

In `src/pages/CreateBoard.jsx`, update the import from `../lib/board`:

```js
import { generateJoinCode } from '../lib/board'
```

- [ ] **Step 2: Add join_code to the board insert**

In `handleSubmit`, inside the `supabase.from('boards').insert({...})` call (around line 64), add `join_code` to the object:

```js
const { data: board, error: boardErr } = await supabase
  .from('boards')
  .insert({
    name: boardName.trim() || game.shortName,
    game_id: game.id,
    home_team: game.homeTeam,
    away_team: game.awayTeam,
    user_id: user.id,
    price_per_square: parseFloat(price) || 10,
    payout_q1: moments.includes('Q1') ? parseFloat(payouts.Q1) || null : null,
    payout_q2: moments.includes('Q2') ? parseFloat(payouts.Q2) || null : null,
    payout_q3: moments.includes('Q3') ? parseFloat(payouts.Q3) || null : null,
    payout_q4: moments.includes('Q4') ? parseFloat(payouts.Q4) || null : null,
    payout_final: moments.includes('Final') ? parseFloat(payouts.Final) || null : null,
    payout_reverse_q1: moments.includes('Q1') ? parseFloat(reversePayouts.Q1) || null : null,
    payout_reverse_q2: moments.includes('Q2') ? parseFloat(reversePayouts.Q2) || null : null,
    payout_reverse_q3: moments.includes('Q3') ? parseFloat(reversePayouts.Q3) || null : null,
    payout_reverse_q4: moments.includes('Q4') ? parseFloat(reversePayouts.Q4) || null : null,
    payout_reverse_final: moments.includes('Final') ? parseFloat(reversePayouts.Final) || null : null,
    scoring_moments: moments,
    rotate_numbers: rotateNumbers,
    join_code: generateJoinCode(),
  })
  .select()
  .single()
```

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, create a new board, and confirm no error on submission. In Supabase Table Editor, check that the new board row has a 6-char `join_code`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CreateBoard.jsx
git commit -m "feat: generate and persist join_code on board creation"
```

---

## Task 4: Join code entry on the Home page

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/Home.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock the board lib
vi.mock('../../lib/board', () => ({
  getBoardByJoinCode: vi.fn(),
}))

// Mock react-router navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}))

import Home from '../Home'
import { getBoardByJoinCode } from '../../lib/board'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

test('entering a valid join code navigates to the board join flow', async () => {
  getBoardByJoinCode.mockResolvedValue('board-uuid-123')
  renderHome()

  fireEvent.change(screen.getByPlaceholderText(/join code/i), { target: { value: 'ABC123' } })
  fireEvent.click(screen.getByRole('button', { name: /join/i }))

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/board/board-uuid-123/join')
  })
})

test('entering an invalid join code shows an error', async () => {
  getBoardByJoinCode.mockResolvedValue(null)
  renderHome()

  fireEvent.change(screen.getByPlaceholderText(/join code/i), { target: { value: 'XXXXXX' } })
  fireEvent.click(screen.getByRole('button', { name: /join/i }))

  await waitFor(() => {
    expect(screen.getByText(/board not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/pages/__tests__/Home.test.jsx
```

Expected: FAIL — join code input not found

- [ ] **Step 3: Add join code section to Home.jsx**

In `src/pages/Home.jsx`, add two new imports at the top:

```jsx
import { useState } from 'react'
import { getBoardByJoinCode } from '../lib/board'
```

Inside the `Home` component, add state and handler before the `return`:

```jsx
const [joinCode, setJoinCode] = useState('')
const [joinError, setJoinError] = useState(null)
const [joinLoading, setJoinLoading] = useState(false)

async function handleJoin(e) {
  e.preventDefault()
  if (!joinCode.trim()) return
  setJoinLoading(true)
  setJoinError(null)
  const boardId = await getBoardByJoinCode(joinCode.trim())
  setJoinLoading(false)
  if (!boardId) {
    setJoinError('Board not found. Check the code and try again.')
    return
  }
  navigate(`/board/${boardId}/join`)
}
```

Then, in the JSX CTAs section (after the "My Boards" button and before the sign out button, around line 117), add:

```jsx
<div style={{ height: '1px', background: 'rgba(var(--sq-accent-rgb),0.1)', margin: '4px 0' }} />

<form onSubmit={handleJoin} style={{ display: 'flex', gap: '8px' }}>
  <input
    type="text"
    value={joinCode}
    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
    placeholder="Join code"
    maxLength={6}
    style={{
      flex: 1,
      fontFamily: 'var(--font-mono)',
      fontSize: '14px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--sq-text)',
      background: 'rgba(var(--sq-alpha),0.04)',
      border: '1px solid rgba(var(--sq-alpha),0.12)',
      padding: '14px 16px',
      borderRadius: '2px',
      outline: 'none',
    }}
  />
  <button
    type="submit"
    disabled={joinLoading || !joinCode.trim()}
    style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '13px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: joinLoading || !joinCode.trim() ? 'rgba(var(--sq-alpha),0.3)' : '#07070e',
      background: joinLoading || !joinCode.trim() ? 'rgba(var(--sq-alpha),0.06)' : '#f59e0b',
      border: 'none',
      padding: '14px 20px',
      borderRadius: '2px',
      cursor: joinLoading || !joinCode.trim() ? 'default' : 'pointer',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}
  >
    {joinLoading ? '…' : 'Join'}
  </button>
</form>
{joinError && (
  <p style={{
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: '#f87171',
    textAlign: 'center',
    marginTop: '-4px',
  }}>
    {joinError}
  </p>
)}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/pages/__tests__/Home.test.jsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`. On the home page, enter a valid join code from an open board in Supabase. Confirm you're redirected to `/board/{id}/join`. Enter a fake code like `ZZZZZZ` and confirm the error message appears.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.jsx src/pages/__tests__/Home.test.jsx
git commit -m "feat: add join code entry form to home page"
```

---

## Task 5: Show join code in AdminDashboard header

**Files:**
- Modify: `src/pages/AdminDashboard.jsx`

- [ ] **Step 1: Add JoinCodePill component and clipboard helper at the top of the file**

At the bottom of `src/pages/AdminDashboard.jsx`, after the existing `StatCell` component, add:

```jsx
function JoinCodePill({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy join code"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: copied ? '#10b981' : 'var(--sq-accent)',
        background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(var(--sq-accent-rgb),0.08)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}`,
        padding: '3px 10px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em' }}>JOIN</span>
      <span>{copied ? 'COPIED' : code}</span>
    </button>
  )
}
```

Note: `useState` is already imported at the top of `AdminDashboard.jsx`.

- [ ] **Step 2: Insert JoinCodePill in the header, after the teams line**

In `src/pages/AdminDashboard.jsx`, the teams line ends around line 150. After it and before the stats strip, add the pill. Change:

```jsx
          {/* Teams line */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
            <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
            <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
          </div>
```

to:

```jsx
          {/* Teams line */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
              <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
            </div>
            {board.join_code && <JoinCodePill code={board.join_code} />}
          </div>
```

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, navigate to an admin dashboard. Confirm the join code pill appears to the right of the teams line. Click it and confirm the clipboard receives the code (paste into a text editor).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminDashboard.jsx
git commit -m "feat: display join code pill in admin dashboard header"
```

---

## Task 6: Show join code in BoardView header

**Files:**
- Modify: `src/pages/BoardView.jsx`

- [ ] **Step 1: Add JoinCodePill component to BoardView.jsx**

At the bottom of `src/pages/BoardView.jsx`, before the closing of the file, add the same `JoinCodePill` component as in Task 5 (copy it verbatim):

```jsx
function JoinCodePill({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy join code"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: copied ? '#10b981' : 'var(--sq-accent)',
        background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(var(--sq-accent-rgb),0.08)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}`,
        padding: '3px 10px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em' }}>JOIN</span>
      <span>{copied ? 'COPIED' : code}</span>
    </button>
  )
}
```

Also add `useState` to the React import at the top if it isn't already there:

```jsx
import { useEffect, useState, useRef } from 'react'
```

- [ ] **Step 2: Insert JoinCodePill in the BoardView header teams line**

In `src/pages/BoardView.jsx`, the teams line is around lines 80–84. Change:

```jsx
          {/* Teams line — full width, sits below QR on narrow screens */}
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
            <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
            <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
          </div>
```

to:

```jsx
          {/* Teams line — full width, sits below QR on narrow screens */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
              <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
            </div>
            {board.join_code && board.status === 'open' && <JoinCodePill code={board.join_code} />}
          </div>
```

Note: the pill is only shown when the board is `open` — no point sharing a join code for a locked board.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, navigate to `/board/{id}`. Confirm join code pill appears when board is open. Lock the board and confirm the pill disappears.

- [ ] **Step 4: Commit**

```bash
git add src/pages/BoardView.jsx
git commit -m "feat: display join code pill in live board header"
```

---

## Task 7: Show join code in PlayerView header

**Files:**
- Modify: `src/pages/PlayerView.jsx`

- [ ] **Step 1: Add JoinCodePill component to PlayerView.jsx**

At the bottom of `src/pages/PlayerView.jsx`, after all existing helper components, add the same `JoinCodePill` component (copy verbatim from Task 5 — do not reference Task 5; include the full code):

```jsx
function JoinCodePill({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy join code"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: copied ? '#10b981' : 'var(--sq-accent)',
        background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(var(--sq-accent-rgb),0.08)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}`,
        padding: '3px 10px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em' }}>JOIN</span>
      <span>{copied ? 'COPIED' : code}</span>
    </button>
  )
}
```

`useState` is already imported at line 1 of `PlayerView.jsx`.

- [ ] **Step 2: Insert JoinCodePill in the PlayerView header teams line**

In `src/pages/PlayerView.jsx`, the teams line is around lines 282–286. Change:

```jsx
            {/* Teams line — full width, sits below QR on narrow screens */}
            <div className="flex items-center gap-3 mb-4">
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
              <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
            </div>
```

to:

```jsx
            {/* Teams line — full width, sits below QR on narrow screens */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
                <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
                <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
              </div>
              {board.join_code && board.status === 'open' && <JoinCodePill code={board.join_code} />}
            </div>
```

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, navigate to `/player/{playerToken}`. Confirm join code pill appears next to the teams line when the board is open.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlayerView.jsx
git commit -m "feat: display join code pill in player view header"
```

---

## Self-Review

### Spec coverage
- [x] "All boards should show the join code in the header" — Tasks 5, 6, 7 cover AdminDashboard, BoardView, PlayerView
- [x] "A join code should be able to be entered on the dashboard" — Task 4 adds the entry form to Home.jsx
- [x] Join codes are persisted per board — Task 1 (DB column) + Task 3 (CreateBoard insert)
- [x] Existing boards backfilled — Task 1 migration handles them

### Placeholder scan
- No TBD, TODO, or "implement later" in any task — all steps contain full code

### Type consistency
- `board.join_code` — used consistently in Tasks 3, 5, 6, 7; comes from `boards` table (Task 1)
- `getBoardByJoinCode(code)` — defined in Task 2, consumed in Task 4 — signatures match
- `generateJoinCode()` — defined in Task 2, called in Task 3 — no args, returns string — consistent
- `JoinCodePill({ code })` — same prop name (`code`) in all three usages (Tasks 5, 6, 7)
