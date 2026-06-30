import { useEffect, useRef, useState } from 'react'
import { useAuth } from './context'
import { canManageMembers } from '../members/permissions'
import { logError } from '../../lib/log'

/**
 * The household name in the top bar. Owners/admins can rename it inline: click
 * the name (or the pencil) to edit, Enter/blur to save, Escape to cancel.
 */
export function HouseholdName() {
  const { household, member, updateHouseholdName } = useAuth()
  const canEdit = canManageMembers(member)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    if (!canEdit) return
    setValue(household?.name ?? '')
    setEditing(true)
  }

  async function commit() {
    if (saving) return
    const next = value.trim()
    if (!next || next === household?.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await updateHouseholdName(next)
      setEditing(false)
    } catch (err) {
      logError('Failed to rename household', err, { HouseholdId: household?.id })
      window.alert('Could not rename the household. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-400">Household</p>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          autoFocus
          disabled={saving}
          maxLength={60}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          aria-label="Household name"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-0.5 text-base font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      ) : canEdit ? (
        <button
          type="button"
          onClick={startEditing}
          className="group flex items-center gap-1.5 rounded-lg text-left"
          aria-label="Rename household"
        >
          <h1 className="truncate text-base font-semibold">{household?.name}</h1>
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100"
          >
            <path d="M13 4l3 3M4 16l1-3L13.5 4.5a1.4 1.4 0 012 2L7 15l-3 1z" />
          </svg>
        </button>
      ) : (
        <h1 className="truncate text-base font-semibold">{household?.name}</h1>
      )}
    </div>
  )
}
