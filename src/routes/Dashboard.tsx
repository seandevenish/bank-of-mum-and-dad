import { useAuth } from '../features/auth/context'

/**
 * Placeholder home screen for Stage 2. Confirms auth + household bootstrap work.
 * Groups, accounts, transactions and recurring rules are added from Stage 3 onwards.
 */
export function Dashboard() {
  const { user, household, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Household</p>
            <h1 className="text-base font-semibold">{household?.name ?? '…'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.email ?? user?.displayName}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">You're signed in 🎉</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Accounts and transactions land in Stage 3. For now this confirms Firebase auth and the
            household were set up correctly.
          </p>
          <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Stage 2 · auth &amp; household ready
          </p>
        </div>
      </main>
    </div>
  )
}
