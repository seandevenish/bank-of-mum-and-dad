import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/context'
import { canAccessGroup, canWriteData } from '../members/permissions'
import { logError, logInfo } from '../../lib/log'
import { fetchRecurringRules, runRecurringCatchUp } from './api'

/**
 * Renders nothing. On app load (once the household is known) it posts any
 * recurring transactions that have fallen due since the last visit. Reads rules
 * once rather than subscribing — catch-up is a load-time action, and the posts
 * flow back into the live transaction subscriptions automatically. Runs at most
 * once per household per session; deterministic post ids keep it safe even if it
 * races another device.
 */
export function RecurringCatchUp() {
  const { user, household, member } = useAuth()
  const ranForRef = useRef<string | null>(null)

  useEffect(() => {
    const householdId = household?.id
    const uid = user?.uid
    // Only writers run catch-up — read-only members' writes would be denied.
    if (!householdId || !uid || !canWriteData(member)) return
    if (ranForRef.current === householdId) return
    ranForRef.current = householdId

    let cancelled = false
    void (async () => {
      try {
        const rules = await fetchRecurringRules(householdId)
        if (cancelled) return
        // A scoped member can only post rules whose group(s) they can access.
        const postable = rules.filter(
          (r) =>
            canAccessGroup(member, r.groupId) &&
            (!r.counterpartGroupId || canAccessGroup(member, r.counterpartGroupId)),
        )
        const posted = await runRecurringCatchUp(householdId, uid, postable)
        if (posted > 0) {
          logInfo('Recurring catch-up posted {Count} transaction(s)', { Count: posted })
        }
      } catch (err) {
        logError('Recurring catch-up failed', err, { HouseholdId: householdId })
        ranForRef.current = null // allow a retry on the next render/visit
      }
    })()

    return () => {
      cancelled = true
    }
  }, [household?.id, user?.uid, member])

  return null
}
