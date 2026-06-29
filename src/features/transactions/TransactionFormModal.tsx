import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { minorToInput, parseMoneyToMinor } from '../../lib/money'
import { todayIso } from '../../lib/dates'
import type { Transaction } from '../../types/models'
import { addTransaction, updateTransaction } from './api'

type Direction = 'in' | 'out'

export function TransactionFormModal({
  householdId,
  createdByUid,
  accountId,
  currency,
  transaction,
  onClose,
}: {
  householdId: string
  createdByUid: string
  accountId: string
  currency: string
  transaction?: Transaction
  onClose: () => void
}) {
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [direction, setDirection] = useState<Direction>(
    transaction && transaction.amountMinor < 0 ? 'out' : 'in',
  )
  const [amount, setAmount] = useState(
    transaction ? minorToInput(Math.abs(transaction.amountMinor)) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = parseMoneyToMinor(amount)
    if (!date || !description.trim() || magnitude === null || magnitude <= 0) {
      setError('Enter a date, description and a positive amount.')
      return
    }
    const amountMinor = direction === 'out' ? -magnitude : magnitude
    setBusy(true)
    setError(null)
    try {
      if (transaction) {
        await updateTransaction(householdId, transaction.id, {
          date,
          description: description.trim(),
          amountMinor,
        })
      } else {
        await addTransaction(householdId, createdByUid, {
          accountId,
          date,
          description,
          amountMinor,
        })
      }
      onClose()
    } catch (err) {
      logError('Failed to save transaction', err, { HouseholdId: householdId, AccountId: accountId })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={transaction ? 'Edit transaction' : 'New transaction'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('in')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              direction === 'in'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Money in
          </button>
          <button
            type="button"
            onClick={() => setDirection('out')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              direction === 'out'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Money out
          </button>
        </div>

        <div>
          <label htmlFor="txn-amount" className={labelClass}>
            Amount ({currency})
          </label>
          <input
            id="txn-amount"
            type="text"
            inputMode="decimal"
            autoFocus
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="txn-description" className={labelClass}>
            Description
          </label>
          <input
            id="txn-description"
            type="text"
            required
            placeholder="e.g. Pocket money"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="txn-date" className={labelClass}>
            Date
          </label>
          <input
            id="txn-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
