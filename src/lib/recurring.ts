/**
 * Recurring-transaction scheduling maths — pure, timezone-safe, no Firestore.
 *
 * Rules post a transaction every `interval` starting from `anchorDate`. The app
 * runs a *catch-up* on load: for each active rule it posts every occurrence that
 * has fallen due (from `nextRunDate` up to and including today), then advances
 * `nextRunDate`. Posts use deterministic ids (`${ruleId}_${date}`) so two devices
 * catching up at once converge on the same docs instead of duplicating.
 *
 * ISO `yyyy-mm-dd` strings sort lexicographically, so date comparisons are plain
 * string comparisons. All Date construction is local-time (date-only) to avoid
 * UTC day-shifts.
 */

import type { Iso8601Date, RecurringInterval } from '../types/models'

/** Hard cap on how many occurrences a single catch-up will post, so a far-past
 * anchor can't create a runaway backlog. ~366 ≈ one year of daily-ish posts. */
export const MAX_CATCHUP_POSTS = 366

interface Schedulable {
  interval: RecurringInterval
  anchorDate: Iso8601Date
  nextRunDate: Iso8601Date
  active: boolean
}

function parseIso(iso: Iso8601Date): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function toIso(year: number, month: number, day: number): Iso8601Date {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of `month` (month is 1-based here).
  return new Date(year, month, 0).getDate()
}

function addDays(iso: Iso8601Date, n: number): Iso8601Date {
  const { year, month, day } = parseIso(iso)
  const dt = new Date(year, month - 1, day)
  dt.setDate(dt.getDate() + n)
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

/**
 * The occurrence that follows `date` for the given schedule. Weekly/fortnightly
 * step a fixed number of days. Monthly preserves the *anchor* day-of-month
 * (clamped to the target month's length), so a 31st anchor lands on the 30th/28th
 * in short months yet returns to the 31st afterwards — no progressive drift.
 */
export function nextOccurrence(rule: Schedulable, date: Iso8601Date): Iso8601Date {
  switch (rule.interval) {
    case 'weekly':
      return addDays(date, 7)
    case 'fortnightly':
      return addDays(date, 14)
    case 'monthly': {
      const anchorDay = parseIso(rule.anchorDate).day
      const { year, month } = parseIso(date)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const day = Math.min(anchorDay, daysInMonth(nextYear, nextMonth))
      return toIso(nextYear, nextMonth, day)
    }
  }
}

/**
 * Every occurrence due on or before `today`, starting at `rule.nextRunDate`.
 * Returns `[]` for inactive rules or when nothing is due yet. Capped at
 * {@link MAX_CATCHUP_POSTS}.
 */
export function computeDueDates(
  rule: Schedulable,
  today: Iso8601Date,
  maxPosts = MAX_CATCHUP_POSTS,
): Iso8601Date[] {
  if (!rule.active) return []
  const due: Iso8601Date[] = []
  let current = rule.nextRunDate
  while (current <= today && due.length < maxPosts) {
    due.push(current)
    current = nextOccurrence(rule, current)
  }
  return due
}
