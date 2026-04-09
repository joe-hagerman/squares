import { supabase } from './supabase'

export function isBoardLocked(board) {
  if (board.rotate_numbers) {
    return !!(board.row_numbers_rotated && board.col_numbers_rotated)
  }
  return !!(board.row_numbers && board.col_numbers)
}

function shuffle10() {
  const arr = [...Array(10).keys()]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Lock a board and assign random 0-9 to both axes.
 * When rotateNumbers is true, generates one independent shuffle per scoring moment.
 */
export async function lockBoard(boardId, { rotateNumbers = false, scoringMoments = [] } = {}) {
  const updateData = { status: 'locked' }

  if (rotateNumbers && scoringMoments.length > 0) {
    const rotatedRows = {}
    const rotatedCols = {}
    for (const m of scoringMoments) {
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

  const { error } = await supabase
    .from('boards')
    .update(updateData)
    .eq('id', boardId)
    .eq('status', 'open')

  return error
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
