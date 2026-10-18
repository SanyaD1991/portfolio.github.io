import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useFeedback } from './feedback'
import { saveOrder } from './upload'

type Table = 'sections' | 'projects' | 'achievements'
type Row = { id: string; sort_order: number }

const bySort = <T extends Row>(a: T, b: T) => a.sort_order - b.sort_order

/** Записи портфолио одной таблицы: загрузка, сохранение, удаление и перетаскивание порядка. */
export function useCollection<T extends Row>(table: Table, portfolioId: string, userId: string) {
  const { notify } = useFeedback()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').eq('portfolio_id', portfolioId).order('sort_order')
    if (error) notify(error.message, 'error')
    const rows = ((data ?? []) as T[]).sort(bySort)
    setItems(rows)
    setLoading(false)
    return rows
  }, [table, portfolioId, notify])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  const nextOrder = useCallback(() => (items.length ? Math.max(...items.map((item) => item.sort_order)) : 0) + 10, [items])

  async function save(draft: Partial<T>): Promise<T | null> {
    const { id, created_at: _created, ...rest } = draft as Partial<T> & { created_at?: string }
    void _created
    const payload = { ...rest, owner_id: userId, portfolio_id: portfolioId }
    const query = id
      ? supabase.from(table).update(payload).eq('id', id).select().single()
      : supabase.from(table).insert(payload).select().single()
    const { data, error } = await query
    if (error || !data) {
      notify(error?.message ?? 'Не удалось сохранить', 'error')
      return null
    }
    const saved = data as T
    setItems((current) => [...current.filter((item) => item.id !== saved.id), saved].sort(bySort))
    return saved
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      notify(error.message, 'error')
      return false
    }
    setItems((current) => current.filter((item) => item.id !== id))
    return true
  }

  /** Принимает новый порядок группы записей (весь список или его часть). */
  async function reorder(next: T[]) {
    const renumbered = new Map(next.map((item, index) => [item.id, (index + 1) * 10]))
    setItems((current) => current.map((item) => (renumbered.has(item.id) ? { ...item, sort_order: renumbered.get(item.id)! } : item)).sort(bySort))
    const error = await saveOrder(table, next)
    if (error) {
      notify(`Не удалось сохранить порядок: ${error.message}`, 'error')
      await reload()
    } else {
      notify('Порядок сохранён')
    }
  }

  return { items, loading, reload, save, remove, reorder, nextOrder }
}
