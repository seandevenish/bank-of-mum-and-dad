import { useMemo, useState, type FormEvent } from 'react'
import { Modal, ModalActions, ModeButton, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { minorToInput, parseMoneyToMinor } from '../../lib/money'
import { todayIso } from '../../lib/dates'
import type { Account, RecurringInterval, RecurringRule } from '../../types/models'
import { addRecurringRule, runRecurringCatchUp, updateRecurringRule } from './api'

type Mode = 'in' | 'out' | 'transfer'

const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
]

export function RecurringRuleFormModal({
  householdId,
  createdByUid,
  account,
  accounts,
  rule,
  onClose,
}: {
  householdId: string
  createdByUid: string
  account: Account
  accounts: Account[]
  rule?: RecurringRule
  onClose: () => void
}) {
  const editing = Boolean(rule)
  const transferTargets = useMemo(
    () => accounts.filter((a) => a.id !== account.id && a.currency === account.currency),
    [accounts, account],
  )

  const [mode, setMode] = useState<Mode>(
    rule?.counterpartAccountId ? 'transfer' : rule && rule.amountMinor < 0 ? 'out' : 'in',
  )
  const [description, setDescription] = useState(rule?.description ?? 'Pocket money')
  const [amount, setAmount] = useState(rule ? minorToInput(Math.abs(rule.amountMinor)) : '')
  const [interval, setInterval] = useState<RecurringInterval>(rule?.interval ?? 'weekly')
  const [anchorDate, setAnchorDate] = useState(rule?.anchorDate ?? todayIso())
  const [toAccountId, setToAccountId] = useState(
    rule?.counterpartAccountId ?? transferTargets[0]?.id ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const magnitude = parseMoneyToMinor(amount)
    if (!description.trim() || magnitude === null || magnitude <= 0 || !anchorDate) {
      setError('Enter a description, a positive amount and a start date.')
      return
    }
    const amountMinor = mode === 'in' ? magnitude : -magnitude // out & transfer debit the source
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
        const to = mode === 'transfer' ? transferTargets.find((a) => a.id === toAccountId) : undefined
        if (mode === 'transfer' && !to) {
          setError('Choose an account to transfer to.')
          setBusy(false)
          return
        }
        const created = await addRecurringRule(householdId, {
          accountId: account.id,
          groupId: account.groupId,
          description,
          amountMinor,
          interval,
          anchorDate,
          counterpartAccountId: to?.id,
          counterpartGroupId: to?.groupId,
        })
        // Post anything already due (e.g. a past start date) now.
        await runRecurringCatchUp(householdId, createdByUid, [created])
      }
      onClose()
    } catch (err) {
      logError('Failed to save recurring rule', err, {
        HouseholdId: householdId,
        AccountId: account.id,
      })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  function pick(next: Mode) {
    setMode(next)
    if (next === 'transfer' && description.trim() === 'Pocket money') setDescription('Transfer')
  }

  const targetName = transferTargets.find((a) => a.id === toAccountId)?.name

  return (
    <Modal title={editing ? 'Edit recurring' : 'New recurring transaction'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label htmlFor="rule-to" className={labelClass}>
              Transfer to
            </label>
            {editing ? (
              <input
                id="rule-to"
                type="text"
                disabled
                value={targetName ?? 'another account'}
                className={`${fieldClass} disabled:bg-slate-100 disabled:text-slate-500`}
              />
            ) : (
              <select
                id="rule-to"
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
            )}
            <p className="mt-1 text-xs text-slate-400">
              Each {interval} run debits {account.name} and credits the chosen account.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="rule-amount" className={labelClass}>
            Amount ({account.currency})
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
            {editing ? 'Started' : 'Starts on'}
          </label>
          <input
            id="rule-anchor"
            type="date"
            required
            disabled={editing}
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className={`${fieldClass} disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {!editing && (
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
