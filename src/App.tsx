import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isFirebaseConfigured } from './firebase/config'
import { AuthProvider } from './features/auth/AuthProvider'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { RecurringCatchUp } from './features/recurring/RecurringCatchUp'
import { PwaStatus } from './features/pwa/PwaStatus'
import { LoadingScreen } from './components/LoadingScreen'

// Route components are code-split so each page (and the heavy modals it pulls in)
// loads on demand rather than bloating the initial bundle.
const SignInPage = lazy(() =>
  import('./features/auth/SignInPage').then((m) => ({ default: m.SignInPage })),
)
const Dashboard = lazy(() => import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const AccountDetail = lazy(() =>
  import('./routes/AccountDetail').then((m) => ({ default: m.AccountDetail })),
)
const Members = lazy(() => import('./routes/Members').then((m) => ({ default: m.Members })))

export default function App() {
  // Before .env.local is filled in, show setup guidance instead of white-screening.
  if (!isFirebaseConfigured) return <ConfigNeeded />

  return (
    <AuthProvider>
      <RecurringCatchUp />
      <PwaStatus />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/:accountId"
              element={
                <ProtectedRoute>
                  <AccountDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <Members />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

function ConfigNeeded() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Firebase config needed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1">.env.local</code> and paste your Firebase web
          config values, then restart the dev server.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Firebase console → Project settings → General → Your apps → SDK setup &amp; configuration.
        </p>
      </div>
    </main>
  )
}
