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

/**
 * Member roles, most to least privileged:
 * - `owner`    — the creator; full control incl. deleting the space + managing
 *                all members. Exactly one per household.
 * - `admin`    — manage members + full data access.
 * - `full`     — create/edit/delete all data, but can't manage members.
 * - `readonly` — view only.
 */
export type MemberRole = 'owner' | 'admin' | 'full' | 'readonly'

export type InviteStatus = 'pending'

/** A household groups one or more parents who share the same data. */
export interface Household {
  id: string
  name: string
  /** The owning user's uid. Optional only for legacy pre-Stage-6 households,
   * which are backfilled on next load. */
  ownerUid?: string
  /** Denormalised list of all member uids for fast rule checks. */
  memberUids: string[]
  createdAt: number
}

/**
 * A member of a household, stored at `households/{hid}/members/{uid}`. Holds the
 * role + scope detail; `memberUids[]` on the household is the fast-lookup mirror.
 */
export interface Member {
  uid: string
  role: MemberRole
  /** Groups this member is limited to. `null` = all groups (unscoped). */
  scopedGroupIds: string[] | null
  email: string
  displayName?: string
  invitedByUid?: string
  joinedAt: number
}

/**
 * A pending invite, stored at `households/{hid}/invites/{emailKey}` where
 * `emailKey` is the lowercased email. Discovered on sign-in via a
 * `collectionGroup('invites')` query matching the signed-in user's email.
 */
export interface Invite {
  email: string
  role: MemberRole
  scopedGroupIds: string[] | null
  householdId: string
  householdName: string
  invitedByUid: string
  createdAt: number
  status: InviteStatus
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
  currency: string // ISO 4217, e.g. 'USD'
  openingBalanceMinor: number
  archived: boolean
  createdAt: number
}

/** A single recorded transaction against an account. */
export interface Transaction {
  id: string
  accountId: string
  /** Denormalised from the account so group-scoped rules can authorise writes
   * without an extra account lookup. */
  groupId: string
  date: Iso8601Date
  description: string
  amountMinor: number // signed: + credit / - debit
  source: TransactionSource
  recurringRuleId?: string
  /** Links the two legs of a transfer (a debit on one account, a credit on the
   * other). Both legs share this id. */
  transferId?: string
  /** The other account in a transfer, for display ("Transfer to/from …"). */
  counterpartAccountId?: string
  createdAt: number
  createdByUid: string
}

/** A rule that auto-posts transactions on a schedule (e.g. pocket money). */
export interface RecurringRule {
  id: string
  accountId: string
  /** Denormalised from the account (see {@link Transaction.groupId}). */
  groupId: string
  description: string
  /** Signed from the `accountId`'s perspective. For a transfer rule this is the
   * (negative) debit on the source; the destination receives the opposite. */
  amountMinor: number
  interval: RecurringInterval
  anchorDate: Iso8601Date
  nextRunDate: Iso8601Date
  lastRunDate?: Iso8601Date
  active: boolean
  /** When set, this rule is a recurring transfer into the counterpart account. */
  counterpartAccountId?: string
  counterpartGroupId?: string
  createdAt: number
}
