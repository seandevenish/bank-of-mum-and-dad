import { useMemo, useState } from 'react'
import { useAuth } from '../features/auth/context'
import { useGroups } from '../features/groups/useGroups'
import { useAccounts } from '../features/accounts/useAccounts'
import { deleteGroup } from '../features/groups/api'
import { deleteAccount } from '../features/accounts/api'
import { GroupFormModal } from '../features/groups/GroupFormModal'
import { AccountFormModal } from '../features/accounts/AccountFormModal'
import { LoadingScreen } from '../components/LoadingScreen'
import { logError } from '../lib/log'
import { formatMoney } from '../lib/money'
import type { Account, Group } from '../types/models'

type ModalState =
  | { type: 'none' }
  | { type: 'group'; group?: Group }
  | { type: 'account'; account?: Account; defaultGroupId?: string }

export function Dashboard() {
  const { user, household, signOut } = useAuth()
  const householdId = household!.id
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  // Accounts indexed by their group for the grouped view.
  const accountsByGroup = useMemo(() => {
    const map = new Map<string, Account[]>()
    for (const account of accounts) {
      const list = map.get(account.groupId) ?? []
      list.push(account)
      map.set(account.groupId, list)
    }
    return map
  }, [accounts])

  async function handleDeleteGroup(group: Group) {
    const groupAccounts = accountsByGroup.get(group.id) ?? []
    if (groupAccounts.length > 0) {
      window.alert('Move or delete this group’s accounts before deleting the group.')
      return
    }
    if (!window.confirm(`Delete the group “${group.name}”?`)) return
    try {
      await deleteGroup(householdId, group.id)
    } catch (err) {
      logError('Failed to delete group', err, { HouseholdId: householdId, GroupId: group.id })
      window.alert('Could not delete the group. Please try again.')
    }
  }

  async function handleDeleteAccount(account: Account) {
    if (!window.confirm(`Delete the account “${account.name}”?`)) return
    try {
      await deleteAccount(householdId, account.id)
    } catch (err) {
      logError('Failed to delete account', err, { HouseholdId: householdId, AccountId: account.id })
      window.alert('Could not delete the account. Please try again.')
    }
  }

  const loading = groupsLoading || accountsLoading
  const error = groupsError ?? accountsError

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Household</p>
            <h1 className="text-base font-semibold">{household?.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.email ?? user?.displayName}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Accounts</h2>
          <button
            type="button"
            onClick={() => setModal({ type: 'group' })}
            className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Add group
          </button>
        </div>

        {loading && <LoadingScreen />}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No groups yet. Add a group (e.g. a child) to start organising accounts.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {groups.map((group) => {
              const groupAccounts = accountsByGroup.get(group.id) ?? []
              const total = groupAccounts.reduce((sum, a) => sum + a.openingBalanceMinor, 0)
              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-xs text-slate-400">{formatMoney(total)} total</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'account', defaultGroupId: group.id })}
                        className="rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                      >
                        + Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'group', group })}
                        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteGroup(group)}
                        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {groupAccounts.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-400">No accounts in this group yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {groupAccounts.map((account) => (
                        <li
                          key={account.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-xs text-slate-400">Balance</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums">
                              {formatMoney(account.openingBalanceMinor, account.currency)}
                            </span>
                            <div className="flex items-center gap-1 text-sm">
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'account', account })}
                                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteAccount(account)}
                                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Transactions and recurring pocket money arrive in the next stages — balances currently show
          each account&apos;s opening balance.
        </p>
      </main>

      {modal.type === 'group' && (
        <GroupFormModal
          householdId={householdId}
          group={modal.group}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'account' && (
        <AccountFormModal
          householdId={householdId}
          groups={groups}
          account={modal.account}
          defaultGroupId={modal.defaultGroupId}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
