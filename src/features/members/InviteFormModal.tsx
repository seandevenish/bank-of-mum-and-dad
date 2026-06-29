import { useState, type FormEvent } from 'react'
import { Modal, ModalActions, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { ASSIGNABLE_ROLES, ROLE_LABEL } from './permissions'
import { createInvite } from './api'
import type { Group, MemberRole } from '../../types/models'

export function InviteFormModal({
  householdId,
  householdName,
  invitedByUid,
  groups,
  onClose,
}: {
  householdId: string
  householdName: string
  invitedByUid: string
  groups: Group[]
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('full')
  const [limitToGroups, setLimitToGroups] = useState(false)
  const [scopedGroupIds, setScopedGroupIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGroup(id: string) {
    setScopedGroupIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError('Enter a valid email address.')
      return
    }
    if (limitToGroups && scopedGroupIds.length === 0) {
      setError('Choose at least one group, or invite with access to all groups.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createInvite(householdId, householdName, invitedByUid, {
        email: trimmed,
        role,
        scopedGroupIds: limitToGroups ? scopedGroupIds : null,
      })
      onClose()
    } catch (err) {
      logError('Failed to create invite', err, { HouseholdId: householdId })
      setError('Could not create the invite. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Invite someone" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="invite-email" className={labelClass}>
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            autoFocus
            required
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-slate-400">
            They’ll join automatically next time they sign in with this email.
          </p>
        </div>

        <div>
          <label htmlFor="invite-role" className={labelClass}>
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className={fieldClass}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={limitToGroups}
                onChange={(e) => setLimitToGroups(e.target.checked)}
                className="rounded border-slate-300"
              />
              Limit to specific groups
            </label>
            {limitToGroups && (
              <div className="mt-2 space-y-1 rounded-lg border border-slate-200 p-3">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={scopedGroupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="rounded border-slate-300"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}

        <ModalActions onCancel={onClose} busy={busy} submitLabel="Send invite" />
      </form>
    </Modal>
  )
}
