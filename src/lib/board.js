import { supabase } from './supabase'

export function isBoardLocked(board) {
  if (board.rotate_numbers) {
    return !!(board.row_numbers_rotated && board.col_numbers_rotated)
  }
  return !!(board.row_numbers && board.col_numbers)
}

/**
 * Lock a board and assign random 0-9 to both axes.
 * Shuffle is performed server-side in the lock-board Edge Function so the
 * client never supplies or sees the numbers before they are committed.
 */
export async function lockBoard(boardId) {
  const { error } = await supabase.functions.invoke('lock-board', {
    body: { boardId },
  })
  return error ?? null
}

export async function unlockBoard(boardId) {
  const { error } = await supabase
    .from('boards')
    .update({
      status: 'open',
      row_numbers: null,
      col_numbers: null,
      row_numbers_rotated: null,
      col_numbers_rotated: null,
    })
    .eq('id', boardId)
    .eq('status', 'locked')

  return error
}

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
  return data?.id ?? null
}
