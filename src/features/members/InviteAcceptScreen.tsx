import { useState } from 'react'
import { useAuth } from '../auth/context'
import { ROLE_LABEL } from './permissions'
import { Spinner } from '../../components/Modal'
import { logError } from '../../lib/log'
import type { Invite } from '../../types/models'

/**
 * Shown after sign-in when the user has pending invites but no household yet.
 * They can join an inviting household or decline and start their own space.
 */
export function InviteAcceptScreen() {
  const { user, pendingInvites, acceptPendingInvite, dismissPendingInvites, signOut } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept(invite: Invite) {
    setBusyId(invite.householdId)
    setError(null)
    try {
      await acceptPendingInvite(invite)
    } catch (err) {
      logError('Failed to accept invite', err, { HouseholdId: invite.householdId })
      setError('Could not accept the invite. Please try again.')
      setBusyId(null)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">You’ve been invited</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user?.email} has been invited to join{' '}
          {pendingInvites.length === 1 ? 'a household' : 'these households'}.
        </p>

        <ul className="mt-5 space-y-3">
          {pendingInvites.map((invite) => (
            <li
              key={invite.householdId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{invite.householdName}</p>
                <p className="text-xs text-slate-400">Joining as {ROLE_LABEL[invite.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleAccept(invite)}
                disabled={busyId !== null}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-70"
              >
                {busyId === invite.householdId && <Spinner />}
                Join
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
          <button
            type="button"
            onClick={dismissPendingInvites}
            disabled={busyId !== null}
            className="text-blue-700 hover:underline disabled:opacity-50"
          >
            No thanks — set up my own space
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-slate-400 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
