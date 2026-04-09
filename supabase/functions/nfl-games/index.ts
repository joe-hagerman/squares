const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const res = await fetch(ESPN_SCOREBOARD)
    if (!res.ok) {
      return new Response(
        JSON.stringify({ games: [], warning: `ESPN returned ${res.status} — no games available` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await res.json()
    const games = (data.events ?? []).map((event: any) => {
      const competition = event.competitions[0]
      const home = competition.competitors.find((c: any) => c.homeAway === 'home')
      const away = competition.competitors.find((c: any) => c.homeAway === 'away')
      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        homeTeam: home?.team.displayName ?? '',
        homeAbbr: home?.team.abbreviation ?? '',
        awayTeam: away?.team.displayName ?? '',
        awayAbbr: away?.team.abbreviation ?? '',
      }
    })

    return new Response(
      JSON.stringify({ games }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
