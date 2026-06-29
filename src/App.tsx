/**
 * Placeholder shell for Stage 1 (scaffolding).
 *
 * Real routing, auth, and feature screens are added from Stage 2 onwards — see
 * the build plan. This component only exists to confirm the toolchain (Vite +
 * React + TypeScript + Tailwind + PWA) is wired up and rendering.
 */
export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-900 text-2xl">
          🏦
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Bank of Mum &amp; Dad</h1>
        <p className="mt-2 text-sm text-slate-500">
          Track pocket money and transactions for your children, across grouped accounts.
        </p>
        <p className="mt-6 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          Stage 1 · scaffolding complete
        </p>
      </div>
    </main>
  )
}
