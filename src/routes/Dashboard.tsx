import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { useGroups } from '../features/groups/useGroups'
import { useAccounts } from '../features/accounts/useAccounts'
import { useTransactions } from '../features/transactions/useTransactions'
import { computeBalances } from '../features/transactions/balances'
import { deleteGroup } from '../features/groups/api'
import { deleteAccount } from '../features/accounts/api'
import { GroupFormModal } from '../features/groups/GroupFormModal'
import { AccountFormModal } from '../features/accounts/AccountFormModal'
import {
  ROLE_LABEL,
  canAccessGroup,
  canManageGroups,
  canWriteData,
} from '../features/members/permissions'
import { HouseholdName } from '../features/auth/HouseholdName'
import { UserMenu } from '../features/auth/UserMenu'
import { LoadingScreen } from '../components/LoadingScreen'
import { logError } from '../lib/log'
import { formatMoney } from '../lib/money'
import type { Account, Group } from '../types/models'

type ModalState =
  | { type: 'none' }
  | { type: 'group'; group?: Group }
  | { type: 'account'; account?: Account; defaultGroupId?: string }

/**
 * A group's accounts may use different currencies, which can't be summed into a
 * single number. Subtotal per currency (using each account's live balance) and
 * join, e.g. "£10.00 · $5.00".
 */
function formatGroupTotals(accounts: Account[], balances: Map<string, number>): string {
  if (accounts.length === 0) return formatMoney(0)
  const byCurrency = new Map<string, number>()
  for (const a of accounts) {
    const balance = balances.get(a.id) ?? a.openingBalanceMinor
    byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + balance)
  }
  return [...byCurrency.entries()].map(([currency, minor]) => formatMoney(minor, currency)).join(' · ')
}

export function Dashboard() {
  const { household, member } = useAuth()
  const householdId = household!.id
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const { transactions, loading: txnsLoading, error: txnsError } = useTransactions()
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  const writable = canWriteData(member)
  const manageGroups = canManageGroups(member)

  // Scoped members only see their groups.
  const visibleGroups = useMemo(
    () => groups.filter((g) => canAccessGroup(member, g.id)),
    [groups, member],
  )

  // Live balances: opening balance + Σ transactions, per account.
  const balances = useMemo(() => computeBalances(accounts, transactions), [accounts, transactions])

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

  const loading = groupsLoading || accountsLoading || txnsLoading
  const error = groupsError ?? accountsError ?? txnsError

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <HouseholdName />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Accounts</h2>
          {manageGroups && (
            <button
              type="button"
              onClick={() => setModal({ type: 'group' })}
              className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              + Add group
            </button>
          )}
        </div>

        {member && member.role === 'readonly' && (
          <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-500">
            You have {ROLE_LABEL[member.role].toLowerCase()} access — viewing only.
          </p>
        )}

        {loading && <LoadingScreen />}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && !error && visibleGroups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              {manageGroups
                ? 'No groups yet. Add a group (e.g. a child) to start organising accounts.'
                : 'No accounts have been shared with you yet.'}
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {visibleGroups.map((group) => {
              const groupAccounts = accountsByGroup.get(group.id) ?? []
              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {formatGroupTotals(groupAccounts, balances)} total
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {writable && (
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'account', defaultGroupId: group.id })}
                          className="rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                        >
                          + Account
                        </button>
                      )}
                      {manageGroups && (
                        <>
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
                        </>
                      )}
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
                          <Link
                            to={`/accounts/${account.id}`}
                            className="group min-w-0 flex-1 hover:opacity-80"
                          >
                            <p className="font-medium group-hover:underline">{account.name}</p>
                            <p className="text-xs text-slate-400">View transactions</p>
                          </Link>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums">
                              {formatMoney(
                                balances.get(account.id) ?? account.openingBalanceMinor,
                                account.currency,
                              )}
                            </span>
                            {writable && (
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
                            )}
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
          Tap an account to view its transactions and recurring pocket money.
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
          groups={visibleGroups}
          account={modal.account}
          defaultGroupId={modal.defaultGroupId}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
