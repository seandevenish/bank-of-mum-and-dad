import { describe, expect, it } from 'vitest'
import { computeDueDates, nextOccurrence, MAX_CATCHUP_POSTS } from './recurring'
import type { RecurringInterval } from '../types/models'

function rule(
  interval: RecurringInterval,
  anchorDate: string,
  nextRunDate = anchorDate,
  active = true,
) {
  return { interval, anchorDate, nextRunDate, active }
}

describe('nextOccurrence', () => {
  it('steps weekly and fortnightly by fixed days', () => {
    expect(nextOccurrence(rule('weekly', '2026-06-01'), '2026-06-01')).toBe('2026-06-08')
    expect(nextOccurrence(rule('fortnightly', '2026-06-01'), '2026-06-01')).toBe('2026-06-15')
  })

  it('crosses month and year boundaries when stepping days', () => {
    expect(nextOccurrence(rule('weekly', '2026-12-28'), '2026-12-28')).toBe('2027-01-04')
  })

  it('steps monthly preserving the anchor day', () => {
    expect(nextOccurrence(rule('monthly', '2026-06-15'), '2026-06-15')).toBe('2026-07-15')
  })

  it('clamps a 31st anchor in short months but returns to 31 afterwards', () => {
    const r = rule('monthly', '2026-01-31')
    const feb = nextOccurrence(r, '2026-01-31')
    expect(feb).toBe('2026-02-28') // 2026 is not a leap year
    expect(nextOccurrence(r, feb)).toBe('2026-03-31') // no drift — back to the 31st
  })
})

describe('computeDueDates', () => {
  it('returns nothing for an inactive rule', () => {
    expect(computeDueDates(rule('weekly', '2026-06-01', '2026-06-01', false), '2026-07-01')).toEqual(
      [],
    )
  })

  it('returns nothing when the next run is still in the future', () => {
    expect(computeDueDates(rule('weekly', '2026-07-01'), '2026-06-29')).toEqual([])
  })

  it('lists every occurrence up to and including today', () => {
    expect(computeDueDates(rule('weekly', '2026-06-01'), '2026-06-22')).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
    ])
  })

  it('starts from nextRunDate, not the anchor', () => {
    expect(computeDueDates(rule('weekly', '2026-06-01', '2026-06-15'), '2026-06-22')).toEqual([
      '2026-06-15',
      '2026-06-22',
    ])
  })

  it('caps a far-past anchor at the maximum backlog', () => {
    const due = computeDueDates(rule('weekly', '2000-01-01'), '2026-06-29')
    expect(due.length).toBe(MAX_CATCHUP_POSTS)
  })
})
