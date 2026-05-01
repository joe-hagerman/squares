/**
 * Maps raw Supabase / PostgREST errors to user-friendly messages.
 *
 * context:
 *   'load' — page-load fetch failures (full-page error state)
 *   'auth' — auth operations (pass through Supabase's message when unrecognised — they're usually readable)
 *   'save' — mutations / operational errors (default)
 */
export function friendlyError(err, context = 'save') {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = typeof err === 'string' ? err : (err.message ?? '')
  const code = typeof err === 'object' ? (err.code ?? '') : ''
  const lower = msg.toLowerCase()

  if (lower.includes('failed to fetch') || lower.includes('fetch failed') ||
      (lower.includes('network') && lower.includes('error'))) {
    return 'Connection error. Please check your internet and try again.'
  }
  // PostgREST: no rows returned (board / record not found)
  if (code === 'PGRST116' || lower.includes('multiple (or no) rows')) {
    return context === 'load' ? 'This page could not be found.' : 'Record not found.'
  }
  // RLS violation
  if (code === '42501' || lower.includes('row-level security')) {
    return "You don't have permission to do that."
  }
  // Duplicate key
  if (code === '23505' || lower.includes('duplicate key')) {
    return 'That value is already taken.'
  }
  // Auth rate limiting
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (context === 'load') return 'Something went wrong loading this page. Please refresh and try again.'
  // Auth messages from Supabase tend to be readable already — pass through if nothing matched.
  if (context === 'auth') return msg || 'Authentication failed. Please try again.'
  return 'Something went wrong. Please try again.'
}
