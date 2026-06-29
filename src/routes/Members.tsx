import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { useGroups } from '../features/groups/useGroups'
import { useHouseholdInvites, useMembers } from '../features/members/useMembers'
import { revokeInvite, removeMember, updateMemberRole } from '../features/members/api'
import { InviteFormModal } from '../features/members/InviteFormModal'
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  canManageMembers,
} from '../features/members/permissions'
import { LoadingScreen } from '../components/LoadingScreen'
import { logError } from '../lib/log'
import type { Invite, Member, MemberRole } from '../types/models'

export function Members() {
  const { user, household, member } = useAuth()
  const householdId = household!.id
  const manage = canManageMembers(member)
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const { invites, loading: invitesLoading, error: invitesError } = useHouseholdInvites()
  const { groups } = useGroups()
  const [inviting, setInviting] = useState(false)

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]))
    return (ids: string[] | null) =>
      ids == null ? 'All groups' : ids.map((id) => map.get(id) ?? '?').join(', ') || 'No groups'
  }, [groups])

  async function handleRoleChange(target: Member, role: MemberRole) {
    try {
      await updateMemberRole(householdId, target.uid, { role })
    } catch (err) {
      logError('Failed to change member role', err, { HouseholdId: householdId, Uid: target.uid })
      window.alert('Could not change the role. Please try again.')
    }
  }

  async function handleRemove(target: Member) {
    if (!window.confirm(`Remove ${target.displayName ?? target.email} from this household?`)) return
    try {
      await removeMember(householdId, target.uid)
    } catch (err) {
      logError('Failed to remove member', err, { HouseholdId: householdId, Uid: target.uid })
      window.alert('Could not remove the member. Please try again.')
    }
  }

  async function handleRevoke(invite: Invite) {
    if (!window.confirm(`Revoke the invite for ${invite.email}?`)) return
    try {
      await revokeInvite(householdId, invite.email)
    } catch (err) {
      logError('Failed to revoke invite', err, { HouseholdId: householdId })
      window.alert('Could not revoke the invite. Please try again.')
    }
  }

  const loading = membersLoading || invitesLoading
  const error = membersError ?? invitesError

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
            ← Accounts
          </Link>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {user?.email ?? user?.displayName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{manage ? 'Members' : 'My access'}</h1>
          {manage && (
            <button
              type="button"
              onClick={() => setInviting(true)}
              className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              + Invite
            </button>
          )}
        </div>

        {loading && <LoadingScreen />}
        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {members.map((m) => {
                const isSelf = m.uid === user?.uid
                const editable = manage && m.role !== 'owner' && !isSelf
                return (
                  <li key={m.uid} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.displayName || m.email}
                        {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.email} · {groupName(m.scopedGroupIds)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {editable ? (
                        <select
                          value={m.role}
                          onChange={(e) => void handleRoleChange(m, e.target.value as MemberRole)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {ROLE_LABEL[m.role]}
                        </span>
                      )}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => void handleRemove(m)}
                          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {manage && invites.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-slate-500">Pending invites</h2>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {invites.map((invite) => (
                    <li
                      key={invite.email}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{invite.email}</p>
                        <p className="text-xs text-slate-400">
                          {ROLE_LABEL[invite.role]} · {groupName(invite.scopedGroupIds)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(invite)}
                        className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      {inviting && (
        <InviteFormModal
          householdId={householdId}
          householdName={household!.name}
          invitedByUid={user!.uid}
          groups={groups}
          onClose={() => setInviting(false)}
        />
      )}
    </div>
  )
}
