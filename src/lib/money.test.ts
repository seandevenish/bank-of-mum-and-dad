import { describe, expect, it } from 'vitest'
import { formatMoney, minorToInput, parseMoneyToMinor } from './money'

describe('formatMoney', () => {
  it('formats minor units as USD', () => {
    expect(formatMoney(1234)).toBe('$12.34')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('formats negative amounts', () => {
    expect(formatMoney(-500)).toBe('-$5.00')
  })
})

describe('parseMoneyToMinor', () => {
  it('parses plain and decorated amounts', () => {
    expect(parseMoneyToMinor('12.34')).toBe(1234)
    expect(parseMoneyToMinor('$12.34')).toBe(1234)
    expect(parseMoneyToMinor('5')).toBe(500)
    expect(parseMoneyToMinor('-5')).toBe(-500)
  })

  it('rounds to the nearest penny', () => {
    expect(parseMoneyToMinor('1.005')).toBe(101)
    expect(parseMoneyToMinor('1.004')).toBe(100)
  })

  it('returns null for invalid input', () => {
    expect(parseMoneyToMinor('')).toBeNull()
    expect(parseMoneyToMinor('abc')).toBeNull()
    expect(parseMoneyToMinor('-')).toBeNull()
    expect(parseMoneyToMinor('.')).toBeNull()
  })
})

describe('minorToInput', () => {
  it('renders a 2dp major-unit string', () => {
    expect(minorToInput(1234)).toBe('12.34')
    expect(minorToInput(500)).toBe('5.00')
    expect(minorToInput(0)).toBe('0.00')
  })
})
