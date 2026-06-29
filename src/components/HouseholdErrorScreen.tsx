import { useAuth } from '../features/auth/context'

/**
 * Shown when the user is authenticated but their household could not be loaded
 * or created (e.g. Firestore unreachable or rules misconfigured). Replaces the
 * old behaviour of silently showing "…" in the header.
 */
export function HouseholdErrorScreen({ message }: { message: string }) {
  const { signOut } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl">
          ⚠️
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Couldn't load your household</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
