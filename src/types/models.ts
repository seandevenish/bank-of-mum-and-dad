/**
 * Shared data-model types for the Firestore documents.
 *
 * Money is always stored as an integer number of minor units (pence) to avoid
 * floating-point rounding errors. Amounts are signed: positive = credit, negative = debit.
 *
 * Dates that represent a calendar day (transaction date, recurring anchor/run dates)
 * are stored as ISO `yyyy-mm-dd` strings. `createdAt` timestamps use Firestore's
 * server timestamp at write time.
 */

export type Iso8601Date = string // 'yyyy-mm-dd'

export type RecurringInterval = 'weekly' | 'fortnightly' | 'monthly'

export type TransactionSource = 'manual' | 'recurring'

/** A household groups one or more parents who share the same data. */
export interface Household {
  id: string
  name: string
  memberUids: string[]
  createdAt: number
}

/** Maps a signed-in user to their household. Stored at top-level `users/{uid}`. */
export interface UserProfile {
  uid: string
  householdId: string
  displayName?: string
  email?: string
}

/** A grouping of accounts — typically one per child/dependent. */
export interface Group {
  id: string
  name: string
  color?: string
  sortOrder: number
  createdAt: number
}

/** An account that transactions are recorded against. Belongs to a group. */
export interface Account {
  id: string
  name: string
  groupId: string
  currency: string // ISO 4217, e.g. 'GBP'
  openingBalanceMinor: number
  archived: boolean
  createdAt: number
}

/** A single recorded transaction against an account. */
export interface Transaction {
  id: string
  accountId: string
  date: Iso8601Date
  description: string
  amountMinor: number // signed: + credit / - debit
  source: TransactionSource
  recurringRuleId?: string
  createdAt: number
  createdByUid: string
}

/** A rule that auto-posts transactions on a schedule (e.g. pocket money). */
export interface RecurringRule {
  id: string
  accountId: string
  description: string
  amountMinor: number // signed
  interval: RecurringInterval
  anchorDate: Iso8601Date
  nextRunDate: Iso8601Date
  lastRunDate?: Iso8601Date
  active: boolean
  createdAt: number
}
