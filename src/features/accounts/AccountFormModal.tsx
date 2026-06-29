import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import { minorToInput, parseMoneyToMinor } from '../../lib/money'
import { CURRENCIES, DEFAULT_CURRENCY } from '../../lib/currencies'
import type { Account, Group } from '../../types/models'
import { addAccount, updateAccount } from './api'

export function AccountFormModal({
  householdId,
  groups,
  account,
  defaultGroupId,
  onClose,
}: {
  householdId: string
  groups: Group[]
  account?: Account
  defaultGroupId?: string
  onClose: () => void
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [groupId, setGroupId] = useState(account?.groupId ?? defaultGroupId ?? groups[0]?.id ?? '')
  const [currency, setCurrency] = useState(account?.currency ?? DEFAULT_CURRENCY)
  const [opening, setOpening] = useState(
    account ? minorToInput(account.openingBalanceMinor) : '0.00',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const openingBalanceMinor = parseMoneyToMinor(opening)
    if (!name.trim() || !groupId || openingBalanceMinor === null) {
      setError('Please fill in all fields with a valid amount.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (account) {
        await updateAccount(householdId, account.id, {
          name: name.trim(),
          groupId,
          currency,
          openingBalanceMinor,
        })
      } else {
        await addAccount(householdId, { name, groupId, currency, openingBalanceMinor })
      }
      onClose()
    } catch (err) {
      logError('Failed to save account', err, { HouseholdId: householdId })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={account ? 'Edit account' : 'New account'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="account-name" className={labelClass}>
            Name
          </label>
          <input
            id="account-name"
            type="text"
            autoFocus
            required
            placeholder="e.g. Savings"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="account-group" className={labelClass}>
            Group
          </label>
          <select
            id="account-group"
            required
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={fieldClass}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="account-currency" className={labelClass}>
            Currency
          </label>
          <select
            id="account-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={fieldClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="account-opening" className={labelClass}>
            Opening balance ({currency})
          </label>
          <input
            id="account-opening"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
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
