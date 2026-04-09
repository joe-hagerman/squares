import { supabase } from './supabase'

const TEAM_ABBR = {
  'Arizona Cardinals': 'ari', 'Atlanta Falcons': 'atl', 'Baltimore Ravens': 'bal',
  'Buffalo Bills': 'buf', 'Carolina Panthers': 'car', 'Chicago Bears': 'chi',
  'Cincinnati Bengals': 'cin', 'Cleveland Browns': 'cle', 'Dallas Cowboys': 'dal',
  'Denver Broncos': 'den', 'Detroit Lions': 'det', 'Green Bay Packers': 'gb',
  'Houston Texans': 'hou', 'Indianapolis Colts': 'ind', 'Jacksonville Jaguars': 'jax',
  'Kansas City Chiefs': 'kc', 'Las Vegas Raiders': 'lv', 'Los Angeles Chargers': 'lac',
  'Los Angeles Rams': 'lar', 'Miami Dolphins': 'mia', 'Minnesota Vikings': 'min',
  'New England Patriots': 'ne', 'New Orleans Saints': 'no', 'New York Giants': 'nyg',
  'New York Jets': 'nyj', 'Philadelphia Eagles': 'phi', 'Pittsburgh Steelers': 'pit',
  'San Francisco 49ers': 'sf', 'Seattle Seahawks': 'sea', 'Tampa Bay Buccaneers': 'tb',
  'Tennessee Titans': 'ten', 'Washington Commanders': 'wsh',
}

export function getTeamLogoUrl(teamName) {
  const abbr = TEAM_ABBR[teamName]
  return abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null
}

export async function fetchNFLGames() {
  const { data, error } = await supabase.functions.invoke('nfl-games')
  if (error) throw new Error(error.message ?? 'Failed to fetch NFL schedule')
  if (data?.error) throw new Error(data.error)
  if (data?.warning) throw new Error(data.warning)
  return data?.games ?? []
}
