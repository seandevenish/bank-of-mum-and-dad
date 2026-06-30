import { useMemo, useState, type FormEvent } from 'react'
import { Modal, ModalActions, ModeButton, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { minorToInput, parseMoneyToMinor } from '../../lib/money'
import { todayIso } from '../../lib/dates'
import type { Account, Transaction } from '../../types/models'
import { addTransaction, addTransfer, updateTransaction } from './api'

type Mode = 'in' | 'out' | 'transfer'

export function TransactionFormModal({
  householdId,
  createdByUid,
  account,
  accounts,
  transaction,
  onClose,
}: {
  householdId: string
  createdByUid: string
  account: Account
  accounts: Account[]
  transaction?: Transaction
  onClose: () => void
}) {
  const editing = Boolean(transaction)
  // Same-currency accounts only — the app never mixes currencies in one balance.
  const transferTargets = useMemo(
    () => accounts.filter((a) => a.id !== account.id && a.currency === account.currency),
    [accounts, account],
  )

  const [mode, setMode] = useState<Mode>(
    transaction && transaction.amountMinor < 0 ? 'out' : 'in',
  )
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(
    transaction ? minorToInput(Math.abs(transaction.amountMinor)) : '',
  )
  const [toAccountId, setToAccountId] = useState(transferTargets[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = parseMoneyToMinor(amount)
    if (!date || !description.trim() || magnitude === null || magnitude <= 0) {
      setError('Enter a date, description and a positive amount.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'transfer') {
        const to = transferTargets.find((a) => a.id === toAccountId)
        if (!to) {
          setError('Choose an account to transfer to.')
          setBusy(false)
          return
        }
        await addTransfer(householdId, createdByUid, {
          from: account,
          to,
          amountMinor: magnitude,
          date,
          description,
        })
      } else {
        const amountMinor = mode === 'out' ? -magnitude : magnitude
        if (transaction) {
          await updateTransaction(householdId, transaction.id, {
            date,
            description: description.trim(),
            amountMinor,
          })
        } else {
          await addTransaction(householdId, createdByUid, {
            accountId: account.id,
            groupId: account.groupId,
            date,
            description,
            amountMinor,
          })
        }
      }
      onClose()
    } catch (err) {
      logError('Failed to save transaction', err, {
        HouseholdId: householdId,
        AccountId: account.id,
      })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  function pick(next: Mode) {
    setMode(next)
    if (next === 'transfer' && !description.trim()) setDescription('Transfer')
  }

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transfers are created fresh, not converted from an existing entry. */}
        {!editing && (
          <div className="grid grid-cols-3 gap-2">
            <ModeButton active={mode === 'in'} onClick={() => pick('in')} tone="green">
              Money in
            </ModeButton>
            <ModeButton active={mode === 'out'} onClick={() => pick('out')} tone="red">
              Money out
            </ModeButton>
            <ModeButton
              active={mode === 'transfer'}
              onClick={() => pick('transfer')}
              tone="blue"
              disabled={transferTargets.length === 0}
            >
              Transfer
            </ModeButton>
          </div>
        )}

        {mode === 'transfer' && (
          <div>
            <label htmlFor="txn-to" className={labelClass}>
              Transfer to
            </label>
            <select
              id="txn-to"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className={fieldClass}
            >
              {transferTargets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Debits {account.name} and credits the chosen account (same currency only).
            </p>
          </div>
        )}

        <div>
          <label htmlFor="txn-amount" className={labelClass}>
            Amount ({account.currency})
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

        <ModalActions onCancel={onClose} busy={busy} />
      </form>
    </Modal>
  )
}
