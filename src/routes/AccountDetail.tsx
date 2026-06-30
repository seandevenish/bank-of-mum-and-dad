import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { useGroups } from '../features/groups/useGroups'
import { useAccounts } from '../features/accounts/useAccounts'
import { useTransactions } from '../features/transactions/useTransactions'
import { deleteTransaction, deleteTransactions } from '../features/transactions/api'
import { TransactionFormModal } from '../features/transactions/TransactionFormModal'
import { TransactionList } from '../features/transactions/TransactionList'
import { useRecurringRules } from '../features/recurring/useRecurringRules'
import { deleteRecurringRule, updateRecurringRule } from '../features/recurring/api'
import { RecurringRuleFormModal } from '../features/recurring/RecurringRuleFormModal'
import { RecurringRulesList } from '../features/recurring/RecurringRulesList'
import { canAccessGroup, canWriteData } from '../features/members/permissions'
import { LoadingScreen } from '../components/LoadingScreen'
import { logError } from '../lib/log'
import { formatMoney } from '../lib/money'
import type { RecurringRule, Transaction } from '../types/models'

type ModalState =
  | { type: 'none' }
  | { type: 'txn'; transaction?: Transaction }
  | { type: 'rule'; rule?: RecurringRule }

export function AccountDetail() {
  const { accountId = '' } = useParams()
  const { user, household, member } = useAuth()
  const householdId = household!.id
  const writable = canWriteData(member)
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const { transactions, loading: txnsLoading, error: txnsError } = useTransactions()
  const { rules, loading: rulesLoading, error: rulesError } = useRecurringRules()
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  const account = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId])
  const group = useMemo(
    () => (account ? groups.find((g) => g.id === account.groupId) : undefined),
    [groups, account],
  )
  const accountTxns = useMemo(
    () => transactions.filter((t) => t.accountId === accountId),
    [transactions, accountId],
  )
  const accountRules = useMemo(
    () => rules.filter((r) => r.accountId === accountId),
    [rules, accountId],
  )
  const balanceMinor = useMemo(
    () =>
      account
        ? account.openingBalanceMinor + accountTxns.reduce((sum, t) => sum + t.amountMinor, 0)
        : 0,
    [account, accountTxns],
  )

  // Accounts this member may transfer to/from; plus a name lookup for transfer rows.
  const accessibleAccounts = useMemo(
    () => accounts.filter((a) => canAccessGroup(member, a.groupId)),
    [accounts, member],
  )
  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  )

  async function handleDelete(txn: Transaction) {
    // Deleting either leg of a transfer removes both.
    if (txn.transferId) {
      const legIds = transactions.filter((t) => t.transferId === txn.transferId).map((t) => t.id)
      if (!window.confirm('Delete this transfer? Both sides will be removed.')) return
      try {
        await deleteTransactions(householdId, legIds)
      } catch (err) {
        logError('Failed to delete transfer', err, { HouseholdId: householdId, TxnId: txn.id })
        window.alert('Could not delete the transfer. Please try again.')
      }
      return
    }
    if (!window.confirm(`Delete “${txn.description}”?`)) return
    try {
      await deleteTransaction(householdId, txn.id)
    } catch (err) {
      logError('Failed to delete transaction', err, { HouseholdId: householdId, TxnId: txn.id })
      window.alert('Could not delete the transaction. Please try again.')
    }
  }

  async function handleToggleRule(rule: RecurringRule) {
    try {
      await updateRecurringRule(householdId, rule.id, { active: !rule.active })
    } catch (err) {
      logError('Failed to toggle recurring rule', err, { HouseholdId: householdId, RuleId: rule.id })
      window.alert('Could not update the recurring transaction. Please try again.')
    }
  }

  async function handleDeleteRule(rule: RecurringRule) {
    if (
      !window.confirm(
        `Delete the recurring “${rule.description}”? Transactions already posted will stay.`,
      )
    )
      return
    try {
      await deleteRecurringRule(householdId, rule.id)
    } catch (err) {
      logError('Failed to delete recurring rule', err, { HouseholdId: householdId, RuleId: rule.id })
      window.alert('Could not delete the recurring transaction. Please try again.')
    }
  }

  const loading = groupsLoading || accountsLoading || txnsLoading || rulesLoading
  const error = groupsError ?? accountsError ?? txnsError ?? rulesError

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
            ← All accounts
          </Link>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {user?.email ?? user?.displayName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && <LoadingScreen />}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && !error && !account && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">This account no longer exists.</p>
            <Link to="/" className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline">
              Back to accounts
            </Link>
          </div>
        )}

        {!loading && !error && account && !canAccessGroup(member, account.groupId) && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">You don’t have access to this account.</p>
            <Link to="/" className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline">
              Back to accounts
            </Link>
          </div>
        )}

        {!loading && !error && account && canAccessGroup(member, account.groupId) && (
          <>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="min-w-0">
                {group && (
                  <p className="text-xs uppercase tracking-wide text-slate-400">{group.name}</p>
                )}
                <h1 className="truncate text-2xl font-semibold">{account.name}</h1>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {formatMoney(balanceMinor, account.currency)}
                </p>
                <p className="text-xs text-slate-400">
                  Opening balance {formatMoney(account.openingBalanceMinor, account.currency)}
                </p>
              </div>
              {writable && (
                <button
                  type="button"
                  onClick={() => setModal({ type: 'txn' })}
                  className="shrink-0 rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  + Add transaction
                </button>
              )}
            </div>

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-500">Recurring</h2>
                {writable && (
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'rule' })}
                    className="rounded-lg px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    + Add recurring
                  </button>
                )}
              </div>
              {accountRules.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-400">
                  No recurring transactions.
                  {writable && ' Add one to auto-post pocket money on a schedule.'}
                </p>
              ) : (
                <RecurringRulesList
                  rules={accountRules}
                  currency={account.currency}
                  canWrite={writable}
                  accountNameById={accountNameById}
                  onEdit={(rule) => setModal({ type: 'rule', rule })}
                  onToggleActive={(rule) => void handleToggleRule(rule)}
                  onDelete={(rule) => void handleDeleteRule(rule)}
                />
              )}
            </div>

            <h2 className="mb-2 text-sm font-semibold text-slate-500">Transactions</h2>
            <TransactionList
              transactions={accountTxns}
              openingBalanceMinor={account.openingBalanceMinor}
              currency={account.currency}
              canWrite={writable}
              accountNameById={accountNameById}
              onEdit={(transaction) => setModal({ type: 'txn', transaction })}
              onDelete={(transaction) => void handleDelete(transaction)}
            />
          </>
        )}
      </main>

      {modal.type === 'txn' && account && (
        <TransactionFormModal
          householdId={householdId}
          createdByUid={user!.uid}
          account={account}
          accounts={accessibleAccounts}
          transaction={modal.transaction}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'rule' && account && (
        <RecurringRuleFormModal
          householdId={householdId}
          createdByUid={user!.uid}
          account={account}
          accounts={accessibleAccounts}
          rule={modal.rule}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
