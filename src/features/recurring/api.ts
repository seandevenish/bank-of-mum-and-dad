import {
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { householdCollection, householdDoc } from '../../lib/firestore'
import { computeDueDates, nextOccurrence } from '../../lib/recurring'
import { todayIso } from '../../lib/dates'
import type { Iso8601Date, RecurringInterval, RecurringRule } from '../../types/models'

export interface RecurringRuleInput {
  accountId: string
  /** Denormalised from the account, for group-scoped write authorisation. */
  groupId: string
  description: string
  amountMinor: number // signed: + credit / - debit
  interval: RecurringInterval
  anchorDate: Iso8601Date
}

/**
 * Create a rule. `nextRunDate` starts at the anchor so the next catch-up posts
 * from the anchor forward. Returns the full rule (with its generated id) so the
 * caller can run an immediate catch-up.
 */
export async function addRecurringRule(
  householdId: string,
  input: RecurringRuleInput,
): Promise<RecurringRule> {
  const ref = doc(householdCollection(householdId, 'recurringRules'))
  const data = {
    accountId: input.accountId,
    groupId: input.groupId,
    description: input.description.trim(),
    amountMinor: input.amountMinor,
    interval: input.interval,
    anchorDate: input.anchorDate,
    nextRunDate: input.anchorDate,
    active: true,
    createdAt: Date.now(),
  }
  await setDoc(ref, data)
  return { id: ref.id, ...data }
}

export async function updateRecurringRule(
  householdId: string,
  id: string,
  patch: Partial<
    Pick<RecurringRule, 'description' | 'amountMinor' | 'interval' | 'active'>
  >,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'recurringRules', id), patch)
}

export async function deleteRecurringRule(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'recurringRules', id))
}

/** One-off read of all rules — used by the catch-up runner on app load. */
export async function fetchRecurringRules(householdId: string): Promise<RecurringRule[]> {
  const snap = await getDocs(householdCollection(householdId, 'recurringRules'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringRule)
}

/**
 * Post every transaction that has fallen due for the given rules and advance
 * each rule's `nextRunDate`/`lastRunDate`. Idempotent across devices: each post
 * uses a deterministic id (`${ruleId}_${date}`), so concurrent catch-ups write
 * the same docs rather than duplicating. Returns the number of posts made.
 */
export async function runRecurringCatchUp(
  householdId: string,
  createdByUid: string,
  rules: RecurringRule[],
): Promise<number> {
  const today = todayIso()
  let posted = 0

  for (const rule of rules) {
    const dueDates = computeDueDates(rule, today)
    if (dueDates.length === 0) continue

    const batch = writeBatch(db)
    for (const date of dueDates) {
      const txnRef = householdDoc(householdId, 'transactions', `${rule.id}_${date}`)
      batch.set(txnRef, {
        accountId: rule.accountId,
        // Fallback keeps pre-Stage-6 rules (no denormalised groupId) writable.
        groupId: rule.groupId ?? '',
        date,
        description: rule.description,
        amountMinor: rule.amountMinor,
        source: 'recurring',
        recurringRuleId: rule.id,
        createdAt: Date.now(),
        createdByUid,
      })
    }

    const lastDue = dueDates[dueDates.length - 1]
    batch.update(householdDoc(householdId, 'recurringRules', rule.id), {
      lastRunDate: lastDue,
      nextRunDate: nextOccurrence(rule, lastDue),
    })

    await batch.commit()
    posted += dueDates.length
  }

  return posted
}
