import { useMemo } from 'react'
import { formatMoney } from '../../lib/money'
import { formatIsoDate } from '../../lib/dates'
import type { Transaction } from '../../types/models'

/**
 * Render an account's transactions newest-first, each with the running balance
 * as at that transaction. `transactions` is expected newest-first; the running
 * balance is computed by walking them oldest-first from the opening balance.
 */
export function TransactionList({
  transactions,
  openingBalanceMinor,
  currency,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[]
  openingBalanceMinor: number
  currency: string
  onEdit: (txn: Transaction) => void
  onDelete: (txn: Transaction) => void
}) {
  // Running balance per transaction id, accumulated oldest-first.
  const balanceAfter = useMemo(() => {
    const map = new Map<string, number>()
    let running = openingBalanceMinor
    for (let i = transactions.length - 1; i >= 0; i--) {
      const txn = transactions[i]
      running += txn.amountMinor
      map.set(txn.id, running)
    }
    return map
  }, [transactions, openingBalanceMinor])

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">
          No transactions yet. Add the first one to start tracking the balance.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {transactions.map((txn) => {
        const credit = txn.amountMinor >= 0
        return (
          <li key={txn.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{txn.description}</p>
              <p className="text-xs text-slate-400">
                {formatIsoDate(txn.date)}
                {txn.source === 'recurring' && ' · recurring'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p
                  className={`font-semibold tabular-nums ${
                    credit ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {credit ? '+' : '−'}
                  {formatMoney(Math.abs(txn.amountMinor), currency).replace('-', '')}
                </p>
                <p className="text-xs text-slate-400 tabular-nums">
                  {formatMoney(balanceAfter.get(txn.id) ?? 0, currency)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => onEdit(txn)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(txn)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
