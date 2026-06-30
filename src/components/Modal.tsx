import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Intentionally no backdrop click-to-close: closing is explicit (Cancel, the
  // close button, or Escape) so an accidental click-away can't discard input.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/** Small inline spinner for buttons in a loading state. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

/**
 * Standard modal footer: a Cancel button plus a submitting button that shows a
 * spinner and is disabled while `busy`.
 */
export function ModalActions({
  onCancel,
  busy,
  submitLabel = 'Save',
}: {
  onCancel: () => void
  busy: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-70"
      >
        {busy && <Spinner />}
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}

/** A segmented-toggle button (e.g. Money in / Money out / Transfer). */
export function ModeButton({
  active,
  onClick,
  tone,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  tone: 'green' | 'red' | 'blue'
  disabled?: boolean
  children: ReactNode
}) {
  const activeTone = {
    green: 'border-green-600 bg-green-50 text-green-700',
    red: 'border-red-600 bg-red-50 text-red-700',
    blue: 'border-blue-600 bg-blue-50 text-blue-700',
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? activeTone : 'border-slate-300 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

/** Shared input styling used across the forms. */
export const fieldClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

export const labelClass = 'block text-sm font-medium text-slate-700'
