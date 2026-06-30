import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './context'
import { canManageMembers } from '../members/permissions'

/**
 * Profile menu in the top bar: a small avatar button that opens a dropdown with
 * the signed-in user's identity, the members link, and sign out — keeping the
 * destructive "Sign out" action tucked away rather than competing for attention.
 */
export function UserMenu() {
  const { user, member, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = user?.displayName ?? user?.email ?? 'Account'
  const initial = label.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            {user?.displayName && (
              <p className="truncate text-sm font-medium text-slate-900">{user.displayName}</p>
            )}
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <Link
            to="/members"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            {canManageMembers(member) ? 'Members' : 'My access'}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
