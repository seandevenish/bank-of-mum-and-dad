export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
