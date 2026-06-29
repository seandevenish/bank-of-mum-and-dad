import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '../../components/Modal'
import { logError } from '../../lib/log'
import type { Group } from '../../types/models'
import { addGroup, updateGroup } from './api'

export function GroupFormModal({
  householdId,
  group,
  onClose,
}: {
  householdId: string
  group?: Group
  onClose: () => void
}) {
  const [name, setName] = useState(group?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (group) await updateGroup(householdId, group.id, { name: name.trim() })
      else await addGroup(householdId, { name })
      onClose()
    } catch (err) {
      logError('Failed to save group', err, { HouseholdId: householdId })
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={group ? 'Edit group' : 'New group'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="group-name" className={labelClass}>
            Name
          </label>
          <input
            id="group-name"
            type="text"
            autoFocus
            required
            placeholder="e.g. Emma"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
