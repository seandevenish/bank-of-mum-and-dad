import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { useGroups } from '../features/groups/useGroups'
import { useAccounts } from '../features/accounts/useAccounts'
import { useTransactions } from '../features/transactions/useTransactions'
import { deleteTransaction } from '../features/transactions/api'
import { TransactionFormModal } from '../features/transactions/TransactionFormModal'
import { TransactionList } from '../features/transactions/TransactionList'
import { LoadingScreen } from '../components/LoadingScreen'
import { logError } from '../lib/log'
import { formatMoney } from '../lib/money'
import type { Transaction } from '../types/models'

type ModalState = { type: 'none' } | { type: 'txn'; transaction?: Transaction }

export function AccountDetail() {
  const { accountId = '' } = useParams()
  const { user, household } = useAuth()
  const householdId = household!.id
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const { transactions, loading: txnsLoading, error: txnsError } = useTransactions()
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
  const balanceMinor = useMemo(
    () =>
      account
        ? account.openingBalanceMinor + accountTxns.reduce((sum, t) => sum + t.amountMinor, 0)
        : 0,
    [account, accountTxns],
  )

  async function handleDelete(txn: Transaction) {
    if (!window.confirm(`Delete “${txn.description}”?`)) return
    try {
      await deleteTransaction(householdId, txn.id)
    } catch (err) {
      logError('Failed to delete transaction', err, { HouseholdId: householdId, TxnId: txn.id })
      window.alert('Could not delete the transaction. Please try again.')
    }
  }

  const loading = groupsLoading || accountsLoading || txnsLoading
  const error = groupsError ?? accountsError ?? txnsError

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

        {!loading && !error && account && (
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
              <button
                type="button"
                onClick={() => setModal({ type: 'txn' })}
                className="shrink-0 rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                + Add transaction
              </button>
            </div>

            <TransactionList
              transactions={accountTxns}
              openingBalanceMinor={account.openingBalanceMinor}
              currency={account.currency}
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
          accountId={account.id}
          currency={account.currency}
          transaction={modal.transaction}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
