import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Encapsulates the send-reminder edge function call with loading/sent/error state.
 * Returns { sending, sent, error, send(squareIds, baseUrl) }.
 */
export function useReminder() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  async function send(squareIds, baseUrl) {
    setSending(true)
    setError(false)
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-reminder', {
        body: { square_ids: squareIds, base_url: baseUrl },
      })
      if (fnErr) {
        setError(true)
        setTimeout(() => setError(false), 3000)
      } else {
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    } finally {
      setSending(false)
    }
  }

  return { sending, sent, error, send }
}
