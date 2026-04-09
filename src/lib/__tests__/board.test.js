import { test, expect } from 'vitest'
import { generateJoinCode } from '../board'

test('generateJoinCode returns a 6-char uppercase alphanumeric string', () => {
  const code = generateJoinCode()
  expect(code).toHaveLength(6)
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
})

test('generateJoinCode produces unique codes', () => {
  const codes = new Set(Array.from({ length: 1000 }, generateJoinCode))
  expect(codes.size).toBeGreaterThan(990)
})
