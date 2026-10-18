import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Award, ExternalLink, Layers, LayoutGrid, LogOut, Plus, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Portfolio } from '../types'
import { useAuth } from './auth-context'
import { Loading } from '../components/Loading'
import { FeedbackProvider, useFeedback } from '../admin/feedback'
import { AchievementsEditor, ProjectsEditor, SectionsEditor, SettingsEditor } from '../admin/Editors'
import { SortableList } from '../admin/SortableList'
import { saveOrder } from '../admin/upload'
import { EmptyHint } from '../admin/Workspace'
import { GripVertical } from 'lucide-react'

type Tab = 'settings' | 'sections' | 'projects' | 'achievements'

const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'settings', label: 'Основное', icon: <Settings size={18} /> },
  { id: 'sections', label: 'Разделы', icon: <Layers size={18} /> },
  { id: 'projects', label: 'Проекты', icon: <LayoutGrid size={18} /> },
  { id: 'achievements', label: 'Достижения', icon: <Award size={18} /> },
]

export function AdminPage() {
  return (
    <FeedbackProvider>
      <AdminShell />
    </FeedbackProvider>
  )
}

function AdminShell() {
  const { user, loading: authLoading } = useAuth()
  const { notify } = useFeedback()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState<Tab>('settings')
  const [loading, setLoading] = useState(true)

  const selected = useMemo(() => portfolios.find((item) => item.id === selectedId) ?? null, [portfolios, selectedId])

  const loadPortfolios = useCallback(async (preferredId?: string) => {
    const { data, error } = await supabase.from('portfolios').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    if (error) notify(error.message, 'error')
    const result = (data ?? []) as Portfolio[]
    setPortfolios(result)
    setSelectedId((current) => {
      const wanted = preferredId ?? current
      return result.some((item) => item.id === wanted) ? wanted : result[0]?.id ?? ''
    })
    setLoading(false)
  }, [notify])

  useEffect(() => {
    if (user) void loadPortfolios()
  }, [user, loadPortfolios])

  if (authLoading) return <main className="page"><Loading /></main>
  if (!user) return <Navigate to="/login" replace />

  async function createPortfolio() {
    const maxOrder = portfolios.reduce((max, item) => Math.max(max, item.sort_order), 0)
    const { data, error } = await supabase.from('portfolios').insert({
      owner_id: user!.id, name: 'Новое портфолио', slug: `portfolio-${Date.now()}`,
      accent_color: '#5eead4', background_color: '#090b0e', text_color: '#e8edf2', sort_order: maxOrder + 10,
    }).select().single()
    if (error) return notify(error.message, 'error')
    notify('Портфолио создано')
    setTab('settings')
    await loadPortfolios(data.id)
  }

  async function reorderPortfolios(next: Portfolio[]) {
    setPortfolios(next)
    const error = await saveOrder('portfolios', next)
    if (error) {
      notify(`Не удалось сохранить порядок: ${error.message}`, 'error')
      await loadPortfolios()
    } else {
      notify('Порядок на главной сохранён')
      setPortfolios(next.map((item, index) => ({ ...item, sort_order: (index + 1) * 10 })))
    }
  }

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-block">
          <div className="sidebar-title">
            <span className="eyebrow">Конструктор</span>
            <button type="button" className="icon-btn accent" onClick={createPortfolio} aria-label="Новое портфолио" title="Новое портфолио"><Plus size={18} /></button>
          </div>
          <p className="sidebar-note">Порядок карточек на главной сайта: перетащите за точки.</p>
          <SortableList items={portfolios} onReorder={(next) => void reorderPortfolios(next)} className="portfolio-list">
            {(item, { handle, dragging }) => (
              <div className={`portfolio-item ${item.id === selectedId ? 'active' : ''} ${dragging ? 'dragging' : ''}`}>
                <button type="button" className="drag-handle" aria-label="Перетащить" {...handle}><GripVertical size={16} /></button>
                <button type="button" className="portfolio-item-body" onClick={() => setSelectedId(item.id)}>
                  <span className="portfolio-thumb">{item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : null}</span>
                  <span className="portfolio-name">{item.name.trim() || 'Без названия'}</span>
                  <span className={`status-dot ${item.is_published ? 'on' : ''}`} title={item.is_published ? 'Опубликовано' : 'Черновик'} />
                </button>
              </div>
            )}
          </SortableList>
        </div>

        {selected && (
          <nav className="admin-nav" aria-label="Разделы редактора">
            {tabs.map((item) => (
              <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span></button>
            ))}
          </nav>
        )}

        <div className="sidebar-actions">
          {selected?.is_published && <Link className="btn ghost" to={`/p/${selected.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Открыть на сайте</Link>}
          <Link className="btn ghost" to="/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Главная сайта</Link>
          <button type="button" className="link-btn" onClick={() => void supabase.auth.signOut()}><LogOut size={15} /> Выйти</button>
        </div>
      </aside>

      <section className="admin-content">
        {loading ? <Loading /> : !selected ? (
          <EmptyHint title="Создайте первое портфолио" text="Внутри можно добавить разделы, проекты и достижения." action={<button type="button" className="btn primary" onClick={createPortfolio}><Plus size={16} /> Создать портфолио</button>} />
        ) : (
          <div className="admin-pane" key={`${selected.id}-${tab}`}>
            {tab === 'settings' && <SettingsEditor portfolio={selected} userId={user.id} onSaved={() => loadPortfolios(selected.id)} onDeleted={() => loadPortfolios()} />}
            {tab === 'sections' && <SectionsEditor portfolio={selected} userId={user.id} />}
            {tab === 'projects' && <ProjectsEditor portfolio={selected} userId={user.id} goToSections={() => setTab('sections')} />}
            {tab === 'achievements' && <AchievementsEditor portfolio={selected} userId={user.id} goToSections={() => setTab('sections')} />}
          </div>
        )}
      </section>
    </main>
  )
}
