/**
 * Date helpers. Calendar days (transaction dates, recurring anchors) are stored
 * as ISO `yyyy-mm-dd` strings in the *local* timezone — never UTC-shifted — so a
 * transaction dated "today" stays on today's date regardless of timezone.
 */

import type { Iso8601Date } from '../types/models'

/** Today's calendar date as a local `yyyy-mm-dd` string. */
export function todayIso(): Iso8601Date {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Format an ISO `yyyy-mm-dd` string for display, e.g. "29 Jun 2026". */
export function formatIsoDate(iso: Iso8601Date, locale = 'en-GB'): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  // Construct in local time (month is 0-based) so no timezone shift occurs.
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
