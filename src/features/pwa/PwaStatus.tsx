import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * The event fired by browsers (Chrome/Edge/Android) when the app meets the
 * install criteria. It isn't in the standard DOM lib types, so we model the
 * bits we use.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Bottom-of-screen PWA chrome: an install button (when the browser offers one),
 * an offline indicator, and a "new version ready" reload prompt. Rendered once
 * at the app root so it floats above every route.
 */
export function PwaStatus() {
  const installPrompt = useInstallPrompt()
  const offline = useOffline()
  const { needRefresh, updateServiceWorker } = useServiceWorkerUpdate()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
      {offline && (
        <Pill className="bg-slate-800 text-white" role="status">
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
          Offline — changes sync when you reconnect
        </Pill>
      )}

      {needRefresh && (
        <Pill className="bg-blue-900 text-white">
          A new version is available.
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="rounded-md bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25"
          >
            Reload
          </button>
        </Pill>
      )}

      {installPrompt.canInstall && (
        <Pill className="bg-white text-slate-900 ring-1 ring-slate-200">
          Install Bank of Mum &amp; Dad
          <button
            type="button"
            onClick={installPrompt.promptInstall}
            className="rounded-md bg-blue-900 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Install
          </button>
          <button
            type="button"
            onClick={installPrompt.dismiss}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Not now
          </button>
        </Pill>
      )}
    </div>
  )
}

function Pill({
  children,
  className = '',
  role,
}: {
  children: React.ReactNode
  className?: string
  role?: string
}) {
  return (
    <div
      role={role}
      className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${className}`}
    >
      {children}
    </div>
  )
}

/** Captures `beforeinstallprompt` so we can offer an in-app Install button. */
function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // stop the mini-infobar; we show our own button
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    canInstall: Boolean(deferred) && !dismissed,
    dismiss: () => setDismissed(true),
    promptInstall: async () => {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null) // a prompt can only be used once
    },
  }
}

/** Tracks online/offline state via the browser's connectivity events. */
function useOffline() {
  const [offline, setOffline] = useState(() => !navigator.onLine)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return offline
}

/** Wraps vite-plugin-pwa's register hook to expose the "update ready" state. */
function useServiceWorkerUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  return { needRefresh, updateServiceWorker }
}
