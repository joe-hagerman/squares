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
    const payload = await req.json()

    // Manual invocation: { winner_id, method: 'email' | 'sms' }
    const winnerId: string = payload.winner_id
    const method: 'email' | 'sms' | 'both' = payload.method ?? 'both'

    if (!winnerId) return new Response('winner_id required', { status: 400, headers: corsHeaders })

    // Fetch winner, square, and board in parallel
    const { data: winner } = await supabase
      .from('winners')
      .select('*')
      .eq('id', winnerId)
      .single()

    if (!winner) return new Response('Winner not found', { status: 404, headers: corsHeaders })

    const [{ data: square }, { data: board }] = await Promise.all([
      supabase.from('squares').select('*').eq('id', winner.square_id).single(),
      supabase.from('boards').select('*').eq('id', winner.board_id).single(),
    ])

    if (!square?.owner_name) return new Response('Square has no owner', { status: 200, headers: corsHeaders })

    const scoreLabel = `${board.away_team} ${winner.away_score} – ${board.home_team} ${winner.home_score}`
    const payoutLabel = winner.payout ? ` Payout: $${winner.payout}.` : ''
    const reverseLabel = winner.is_reverse ? ' (reverse)' : ''
    const shortMsg = `🏆 You won the ${winner.moment}${reverseLabel} square! ${board.name}: ${scoreLabel}.${payoutLabel}`

    const results: { method: string; success: boolean; error_message?: string }[] = []

    // ── SMS via Twilio ──────────────────────────────────────────────
    if ((method === 'sms' || method === 'both') && square.owner_phone) {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')

      if (twilioSid && twilioToken && twilioFrom) {
        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: square.owner_phone,
              From: twilioFrom,
              Body: shortMsg,
            }),
          },
        )
        if (smsRes.ok) {
          results.push({ method: 'sms', success: true })
        } else {
          results.push({ method: 'sms', success: false, error_message: await smsRes.text() })
        }
      }
    }

    // ── Email via Resend ────────────────────────────────────────────
    if ((method === 'email' || method === 'both') && square.owner_email) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (!resendKey) return new Response('RESEND_API_KEY not configured', { status: 500, headers: corsHeaders })

      const reverseHeading = winner.is_reverse ? ' (Reverse)' : ''
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h1 style="color:#ca8a04">🏆 You won${reverseHeading}!</h1>
          <p>Hi ${square.owner_name},</p>
          <p>You have a winning square in <strong>${board.name}</strong>!</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:6px 0;color:#6b7280">Scoring moment</td><td><strong>${winner.moment}${reverseHeading}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Score</td><td><strong>${scoreLabel}</strong></td></tr>
            ${winner.payout ? `<tr><td style="padding:6px 0;color:#6b7280">Payout</td><td><strong>$${winner.payout}</strong></td></tr>` : ''}
          </table>
          <p style="color:#6b7280;font-size:14px">Congratulations!</p>
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
          to: [square.owner_email],
          subject: `🏆 You won the ${winner.moment}${reverseHeading} square! — ${board.name}`,
          html,
        }),
      })
      if (emailRes.ok) {
        results.push({ method: 'email', success: true })
      } else {
        results.push({ method: 'email', success: false, error_message: await emailRes.text() })
      }
    }

    // ── Write notification history ──────────────────────────────────
    if (results.length > 0) {
      await supabase.from('winner_notifications').insert(
        results.map((r) => ({
          winner_id: winner.id,
          method: r.method,
          success: r.success,
          error_message: r.error_message ?? null,
        }))
      )
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
