import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function shuffle10(): number[] {
  const arr = [...Array(10).keys()]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Use the caller's JWT so RLS enforces ownership — only the board owner can lock their board.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { boardId } = await req.json()
    if (!boardId) {
      return new Response('boardId required', { status: 400, headers: corsHeaders })
    }

    // Read board config — RLS rejects if caller doesn't own it.
    const { data: board, error: fetchErr } = await supabase
      .from('boards')
      .select('rotate_numbers, scoring_moments, status')
      .eq('id', boardId)
      .single()

    if (fetchErr || !board) {
      return new Response('Board not found', { status: 404, headers: corsHeaders })
    }
    if (board.status !== 'open') {
      return new Response('Board is not open', { status: 409, headers: corsHeaders })
    }

    // Shuffle server-side — client never sees or supplies the numbers.
    const updateData: Record<string, unknown> = { status: 'locked' }

    if (board.rotate_numbers && board.scoring_moments?.length > 0) {
      const rotatedRows: Record<string, number[]> = {}
      const rotatedCols: Record<string, number[]> = {}
      for (const m of board.scoring_moments) {
        rotatedRows[m] = shuffle10()
        rotatedCols[m] = shuffle10()
      }
      updateData.row_numbers = null
      updateData.col_numbers = null
      updateData.row_numbers_rotated = rotatedRows
      updateData.col_numbers_rotated = rotatedCols
    } else {
      updateData.row_numbers = shuffle10()
      updateData.col_numbers = shuffle10()
      updateData.row_numbers_rotated = null
      updateData.col_numbers_rotated = null
    }

    const { error: updateErr } = await supabase
      .from('boards')
      .update(updateData)
      .eq('id', boardId)
      .eq('status', 'open') // idempotency guard

    if (updateErr) {
      return new Response(updateErr.message, { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(String(err), { status: 500, headers: corsHeaders })
  }
})
