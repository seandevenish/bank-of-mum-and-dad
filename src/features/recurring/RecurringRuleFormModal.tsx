import { useState, type FormEvent } from 'react'
import { Modal, ModalActions, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { minorToInput, parseMoneyToMinor } from '../../lib/money'
import { todayIso } from '../../lib/dates'
import type { RecurringInterval, RecurringRule } from '../../types/models'
import { addRecurringRule, runRecurringCatchUp, updateRecurringRule } from './api'

type Direction = 'in' | 'out'

const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
]

export function RecurringRuleFormModal({
  householdId,
  createdByUid,
  accountId,
  groupId,
  currency,
  rule,
  onClose,
}: {
  householdId: string
  createdByUid: string
  accountId: string
  groupId: string
  currency: string
  rule?: RecurringRule
  onClose: () => void
}) {
  const [description, setDescription] = useState(rule?.description ?? 'Pocket money')
  const [direction, setDirection] = useState<Direction>(
    rule && rule.amountMinor < 0 ? 'out' : 'in',
  )
  const [amount, setAmount] = useState(rule ? minorToInput(Math.abs(rule.amountMinor)) : '')
  const [interval, setInterval] = useState<RecurringInterval>(rule?.interval ?? 'weekly')
  const [anchorDate, setAnchorDate] = useState(rule?.anchorDate ?? todayIso())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = parseMoneyToMinor(amount)
    if (!description.trim() || magnitude === null || magnitude <= 0 || !anchorDate) {
      setError('Enter a description, a positive amount and a start date.')
      return
    }
    const amountMinor = direction === 'out' ? -magnitude : magnitude
    setBusy(true)
    setError(null)
    try {
      if (rule) {
        await updateRecurringRule(householdId, rule.id, {
          description: description.trim(),
          amountMinor,
          interval,
        })
      } else {
        const created = await addRecurringRule(householdId, {
          accountId,
          groupId,
          description,
          amountMinor,
          interval,
          anchorDate,
        })
        // Post anything already due (e.g. a start date of today or earlier) now,
        // rather than waiting for the next app load.
        await runRecurringCatchUp(householdId, createdByUid, [created])
      }
      onClose()
    } catch (err) {
      logError('Failed to save recurring rule', err, { HouseholdId: householdId, AccountId: accountId })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={rule ? 'Edit recurring' : 'New recurring transaction'} onClose={onClose}>
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
          <label htmlFor="rule-amount" className={labelClass}>
            Amount ({currency})
          </label>
          <input
            id="rule-amount"
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
          <label htmlFor="rule-description" className={labelClass}>
            Description
          </label>
          <input
            id="rule-description"
            type="text"
            required
            placeholder="e.g. Pocket money"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="rule-interval" className={labelClass}>
            Repeats
          </label>
          <select
            id="rule-interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as RecurringInterval)}
            className={fieldClass}
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rule-anchor" className={labelClass}>
            {rule ? 'Started' : 'Starts on'}
          </label>
          <input
            id="rule-anchor"
            type="date"
            required
            disabled={Boolean(rule)}
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className={`${fieldClass} disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {!rule && (
            <p className="mt-1 text-xs text-slate-400">
              A start date in the past will back-fill the transactions due since then.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <ModalActions onCancel={onClose} busy={busy} />
      </form>
    </Modal>
  )
}
