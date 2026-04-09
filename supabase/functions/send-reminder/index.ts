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

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response('RESEND_API_KEY not configured', { status: 500, headers: corsHeaders })
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

    // Validate all squares belong to the same board
    const boardIds = [...new Set(squares.map((s) => s.board_id))]
    if (boardIds.length > 1) {
      return new Response('All square_ids must belong to the same board', { status: 400, headers: corsHeaders })
    }
    const boardId = boardIds[0]
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

    const results: { email: string; success: boolean; error?: string }[] = []

    for (const player of Object.values(playerMap)) {
      const count = player.squares.length
      const total = (count * board.price_per_square).toFixed(2).replace(/\.00$/, '')
      const playerUrl = base_url && player.token ? `${base_url}/player/${player.token}` : null

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
          from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'Football Squares <joe@hagerman.dev>',
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
