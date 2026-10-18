import { useCallback, useMemo, useState } from 'react'

/** Черновик записи с отслеживанием несохранённых изменений. */
export function useDraftState<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial)
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial))

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline])

  const reset = useCallback((next: T) => {
    setDraft(next)
    setBaseline(JSON.stringify(next))
  }, [])

  const patch = useCallback((changes: Partial<T>) => setDraft((current) => ({ ...current, ...changes })), [])

  return { draft, setDraft, patch, dirty, reset }
}
