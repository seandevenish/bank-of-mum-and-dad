import { useEffect, useState } from 'react'
import { onSnapshot, type Query } from 'firebase/firestore'
import { logError } from '../lib/log'

export interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

/**
 * Subscribe to a Firestore query and keep its documents in React state, with
 * each document's id merged in. Pass `null` while the query isn't ready (e.g.
 * before the household has loaded).
 *
 * IMPORTANT: memoise the `query` in the calling hook (useMemo keyed by the ids
 * it depends on) so this effect doesn't re-subscribe on every render.
 */
export function useCollection<T>(query: Query | null, label = 'collection'): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: Boolean(query),
    error: null,
  })

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    const unsubscribe = onSnapshot(
      query,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]
        setState({ data, loading: false, error: null })
      },
      (err) => {
        logError('Snapshot error for {Label}', err, { Label: label })
        setState({ data: [], loading: false, error: err.message })
      },
    )
    return unsubscribe
  }, [query, label])

  return state
}
