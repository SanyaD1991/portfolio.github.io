import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, FileUp, ImagePlus, LogOut, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Achievement, Portfolio, PortfolioSection, Project, SectionType } from '../types'
import { useAuth } from './auth-context'
import { Loading } from '../components/Loading'

type Tab = 'settings' | 'sections' | 'projects' | 'achievements' | 'media'

type EditablePortfolio = Pick<Portfolio, 'name' | 'slug' | 'subtitle' | 'about' | 'cover_url' | 'contact_email' | 'accent_color' | 'background_color' | 'text_color' | 'is_published' | 'sort_order'>
const emptyPortfolio: EditablePortfolio = {
  name: '', slug: '', subtitle: '', about: '', cover_url: '', contact_email: '',
  accent_color: '#d95d39', background_color: '#f4f0e8', text_color: '#161616', is_published: false, sort_order: 10,
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState<Tab>('settings')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const selected = useMemo(() => portfolios.find((item) => item.id === selectedId) ?? null, [portfolios, selectedId])

  async function loadPortfolios(preferredId?: string) {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase.from('portfolios').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    if (error) setNotice(error.message)
    const result = (data ?? []) as Portfolio[]
    setPortfolios(result)
    setSelectedId(preferredId ?? selectedId ?? result[0]?.id ?? '')
    if (!preferredId && !selectedId && result[0]) setSelectedId(result[0].id)
    setLoading(false)
  }

  useEffect(() => { if (user) void loadPortfolios() }, [user])

  if (authLoading) return <main className="page"><Loading /></main>
  if (!user) return <Navigate to="/login" replace />

  async function createPortfolio() {
    const slug = `portfolio-${Date.now()}`
    const { data, error } = await supabase.from('portfolios').insert({
      owner_id: user!.id, name: 'Новое портфолио', slug,
      accent_color: '#d95d39', background_color: '#f4f0e8', text_color: '#161616',
      sort_order: portfolios.length * 10 + 10,
    }).select().single()
    if (error) return setNotice(error.message)
    await loadPortfolios(data.id)
  }

  async function removePortfolio() {
    if (!selected || !confirm(`Удалить «${selected.name}» вместе со всем содержимым?`)) return
    const { error } = await supabase.from('portfolios').delete().eq('id', selected.id)
    if (error) return setNotice(error.message)
    setSelectedId('')
    await loadPortfolios()
  }

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <span className="eyebrow">Конструктор</span>
          <h1>Портфолио</h1>
        </div>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Выберите портфолио</option>
          {portfolios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="button secondary" onClick={createPortfolio}><Plus size={18} /> Новое портфолио</button>
        <nav className="admin-nav">
          {(['settings', 'sections', 'projects', 'achievements', 'media'] as Tab[]).map((item) => (
            <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{tabLabels[item]}</button>
          ))}
        </nav>
        <div className="sidebar-actions">
          {selected?.is_published && <a className="button ghost" href={`/p/${selected.slug}`} target="_blank" rel="noreferrer"><Eye size={18} /> Открыть сайт</a>}
          {selected && <button className="danger-link" onClick={removePortfolio}><Trash2 size={16} /> Удалить портфолио</button>}
          <button className="ghost-link" onClick={() => void supabase.auth.signOut()}><LogOut size={16} /> Выйти</button>
        </div>
      </aside>

      <section className="admin-content">
        {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
        {loading ? <Loading /> : !selected ? <EmptyPortfolio create={createPortfolio} /> : (
          <>
            {tab === 'settings' && <SettingsEditor portfolio={selected} userId={user.id} onSaved={() => loadPortfolios(selected.id)} setNotice={setNotice} />}
            {tab === 'sections' && <SectionsEditor portfolio={selected} userId={user.id} setNotice={setNotice} />}
            {tab === 'projects' && <ProjectsEditor portfolio={selected} userId={user.id} setNotice={setNotice} />}
            {tab === 'achievements' && <AchievementsEditor portfolio={selected} userId={user.id} setNotice={setNotice} />}
            {tab === 'media' && <MediaManager userId={user.id} setNotice={setNotice} />}
          </>
        )}
      </section>
    </main>
  )
}

const tabLabels: Record<Tab, string> = {
  settings: 'Основное', sections: 'Разделы', projects: 'Проекты', achievements: 'Достижения', media: 'Медиа',
}

function EmptyPortfolio({ create }: { create: () => void }) {
  return <div className="empty-state"><h2>Создайте первое портфолио</h2><p>Внутри можно добавить разделы, проекты и достижения.</p><button className="button" onClick={create}><Plus size={18} /> Создать</button></div>
}

function SettingsEditor({ portfolio, onSaved, setNotice }: { portfolio: Portfolio; userId: string; onSaved: () => void; setNotice: (value: string) => void }) {
  const [form, setForm] = useState<EditablePortfolio>({ ...emptyPortfolio, ...portfolio })
  useEffect(() => setForm({ ...emptyPortfolio, ...portfolio }), [portfolio])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase.from('portfolios').update(form).eq('id', portfolio.id)
    setNotice(error ? error.message : 'Настройки сохранены')
    if (!error) onSaved()
  }

  return (
    <EditorPanel title="Основные настройки" subtitle="Название, адрес, описание и визуальная тема.">
      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid two"><Field label="Название"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field><Field label="Адрес страницы"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required /></Field></div>
        <Field label="Короткий подзаголовок"><input value={form.subtitle ?? ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
        <Field label="О проекте / авторе"><textarea rows={6} value={form.about ?? ''} onChange={(e) => setForm({ ...form, about: e.target.value })} /></Field>
        <div className="form-grid two"><Field label="Обложка — URL"><input value={form.cover_url ?? ''} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></Field><Field label="Контактный email"><input type="email" value={form.contact_email ?? ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field></div>
        <Field label="Порядок портфолио на главной"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /><small>Чем меньше число, тем выше портфолио. Например: 10, 20, 30.</small></Field>
        <div className="form-grid three"><ColorField label="Акцент" value={form.accent_color} set={(value) => setForm({ ...form, accent_color: value })} /><ColorField label="Фон" value={form.background_color} set={(value) => setForm({ ...form, background_color: value })} /><ColorField label="Текст" value={form.text_color} set={(value) => setForm({ ...form, text_color: value })} /></div>
        <label className="toggle"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /><span>Опубликовать портфолио</span></label>
        <button className="button" type="submit"><Save size={18} /> Сохранить</button>
      </form>
    </EditorPanel>
  )
}

function SectionsEditor({ portfolio, userId, setNotice }: EditorProps) {
  const [items, setItems] = useState<PortfolioSection[]>([])
  const [editing, setEditing] = useState<Partial<PortfolioSection>>({ title: '', type: 'text', body: '', sort_order: 10, is_published: true })
  const load = async () => { const { data } = await supabase.from('sections').select('*').eq('portfolio_id', portfolio.id).order('sort_order'); setItems((data ?? []) as PortfolioSection[]) }
  useEffect(() => { void load() }, [portfolio.id])

  async function save(event: FormEvent) {
    event.preventDefault()
    const payload = { ...editing, owner_id: userId, portfolio_id: portfolio.id }
    const query = editing.id ? supabase.from('sections').update(payload).eq('id', editing.id) : supabase.from('sections').insert(payload)
    const { error } = await query
    setNotice(error ? error.message : 'Раздел сохранён')
    if (!error) { setEditing({ title: '', type: 'text', body: '', sort_order: items.length * 10 + 10, is_published: true }); await load() }
  }

  return <CrudEditor title="Разделы страницы" subtitle="Разделы определяют порядок и структуру портфолио" items={items} editingId={editing.id} onEdit={setEditing} onDelete={async (id) => { if (confirm('Удалить раздел?')) { await supabase.from('sections').delete().eq('id', id); await load() } }}>
    <form className="editor-form" onSubmit={save}>
      <Field label="Заголовок"><input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
      <div className="form-grid two"><Field label="Тип"><select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as SectionType })}><option value="text">Текст</option><option value="projects">Проекты</option><option value="achievements">Достижения</option></select></Field><Field label="Порядок"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field></div>
      {editing.type === 'text' && <Field label="Текст"><textarea rows={8} value={editing.body ?? ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>}
      <PublishToggle checked={editing.is_published ?? true} set={(value) => setEditing({ ...editing, is_published: value })} />
      <FormActions cancel={() => setEditing({ title: '', type: 'text', body: '', sort_order: items.length * 10 + 10, is_published: true })} />
    </form>
  </CrudEditor>
}

function ProjectsEditor({ portfolio, userId, setNotice }: EditorProps) {
  const empty: Partial<Project> = { section_id: null, title: '', summary: '', description: '', year: '', role: '', cover_url: '', project_url: '', gallery: [], video_urls: [], tags: [], sort_order: 10, is_published: true }
  const [items, setItems] = useState<Project[]>([])
  const [projectSections, setProjectSections] = useState<PortfolioSection[]>([])
  const [editing, setEditing] = useState<Partial<Project>>(empty)

  const load = async () => {
    const [projectResult, sectionResult] = await Promise.all([
      supabase.from('projects').select('*').eq('portfolio_id', portfolio.id).order('sort_order'),
      supabase.from('sections').select('*').eq('portfolio_id', portfolio.id).eq('type', 'projects').order('sort_order'),
    ])
    setItems((projectResult.data ?? []) as Project[])
    const sections = (sectionResult.data ?? []) as PortfolioSection[]
    setProjectSections(sections)
    setEditing((current) => current.id || current.section_id || !sections.length
      ? current
      : { ...current, section_id: sections[0].id })
  }

  useEffect(() => {
    setEditing(empty)
    void load()
  }, [portfolio.id])

  function resetEditor(nextOrder = items.length * 10 + 10) {
    setEditing({ ...empty, section_id: projectSections[0]?.id ?? null, sort_order: nextOrder })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing.section_id) {
      setNotice('Сначала выберите раздел для проекта')
      return
    }

    const payload = {
      ...editing,
      owner_id: userId,
      portfolio_id: portfolio.id,
      section_id: editing.section_id,
      tags: editing.tags ?? [],
      gallery: editing.gallery ?? [],
      video_urls: editing.video_urls ?? [],
    }
    const query = editing.id ? supabase.from('projects').update(payload).eq('id', editing.id) : supabase.from('projects').insert(payload)
    const { error } = await query
    setNotice(error ? error.message : 'Проект сохранён')
    if (!error) { resetEditor(); await load() }
  }

  const sectionName = (project: Project) => projectSections.find((section) => section.id === project.section_id)?.title ?? 'Без раздела'

  return <CrudEditor title="Проекты" subtitle="Каждый проект относится только к одному разделу страницы" items={items} editingId={editing.id} onEdit={setEditing} getMeta={sectionName} onDelete={async (id) => { if (confirm('Удалить проект?')) { await supabase.from('projects').delete().eq('id', id); await load() } }}>
    <form className="editor-form" onSubmit={save}>
      <Field label="Раздел проекта">
        <select value={editing.section_id ?? ''} onChange={(e) => setEditing({ ...editing, section_id: e.target.value || null })} required>
          <option value="" disabled>{projectSections.length ? 'Выберите раздел' : 'Сначала создайте раздел типа «Проекты»'}</option>
          {projectSections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
        </select>
      </Field>
      {!projectSections.length && <p className="field-hint">Откройте вкладку «Разделы», создайте раздел с типом «Проекты», затем вернитесь сюда.</p>}
      <Field label="Название"><input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
      <div className="form-grid two"><Field label="Год"><input value={editing.year ?? ''} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></Field><Field label="Роль"><input value={editing.role ?? ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></Field></div>
      <Field label="Короткое описание"><textarea rows={3} value={editing.summary ?? ''} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></Field>
      <Field label="Подробное описание"><textarea rows={7} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
      <Field label="Обложка — URL"><input value={editing.cover_url ?? ''} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} /></Field>
      <Field label="Ссылка на проект"><input type="url" placeholder="https://example.com/project" value={editing.project_url ?? ''} onChange={(e) => setEditing({ ...editing, project_url: e.target.value })} /></Field>
      <p className="field-hint">Можно указать ссылку на опубликованный сайт, приложение, статью, Behance или другую страницу проекта. Если поле пустое, кнопка на сайте не показывается.</p>
      <Field label="Галерея — по одному URL в строке"><textarea rows={4} value={(editing.gallery ?? []).join('\n')} onChange={(e) => setEditing({ ...editing, gallery: lines(e.target.value) })} /></Field>
      <Field label="Видео — по одной ссылке в строке"><textarea rows={4} placeholder="YouTube, Vimeo, Rutube, VK Видео или прямая ссылка на .mp4" value={(editing.video_urls ?? []).join('\n')} onChange={(e) => setEditing({ ...editing, video_urls: lines(e.target.value) })} /></Field>
      <p className="field-hint">Для YouTube, Vimeo, Rutube и VK Видео вставьте обычную ссылку из адресной строки. Большие видеофайлы лучше хранить на видеохостинге, а не загружать в Supabase.</p>
      <div className="form-grid two"><Field label="Теги — через запятую"><input value={(editing.tags ?? []).join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} /></Field><Field label="Порядок"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field></div>
      <PublishToggle checked={editing.is_published ?? true} set={(value) => setEditing({ ...editing, is_published: value })} />
      <FormActions cancel={() => resetEditor()} />
    </form>
  </CrudEditor>
}

function AchievementsEditor({ portfolio, userId, setNotice }: EditorProps) {
  const empty: Partial<Achievement> = { section_id: null, title: '', issuer: '', achievement_date: '', description: '', image_url: '', pdf_url: '', link_url: '', sort_order: 10, is_published: true }
  const [items, setItems] = useState<Achievement[]>([])
  const [achievementSections, setAchievementSections] = useState<PortfolioSection[]>([])
  const [editing, setEditing] = useState<Partial<Achievement>>(empty)

  const load = async () => {
    const [achievementResult, sectionResult] = await Promise.all([
      supabase.from('achievements').select('*').eq('portfolio_id', portfolio.id).order('sort_order'),
      supabase.from('sections').select('*').eq('portfolio_id', portfolio.id).eq('type', 'achievements').order('sort_order'),
    ])
    setItems((achievementResult.data ?? []) as Achievement[])
    const sections = (sectionResult.data ?? []) as PortfolioSection[]
    setAchievementSections(sections)
    setEditing((current) => current.id || current.section_id || !sections.length
      ? current
      : { ...current, section_id: sections[0].id })
  }

  useEffect(() => {
    setEditing(empty)
    void load()
  }, [portfolio.id])

  function resetEditor(nextOrder = items.length * 10 + 10) {
    setEditing({ ...empty, section_id: achievementSections[0]?.id ?? null, sort_order: nextOrder })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing.section_id) {
      setNotice('Сначала выберите раздел для достижения')
      return
    }

    const payload = {
      ...editing,
      owner_id: userId,
      portfolio_id: portfolio.id,
      section_id: editing.section_id,
    }
    const query = editing.id ? supabase.from('achievements').update(payload).eq('id', editing.id) : supabase.from('achievements').insert(payload)
    const { error } = await query
    setNotice(error ? error.message : 'Достижение сохранено')
    if (!error) { resetEditor(); await load() }
  }

  const sectionName = (achievement: Achievement) => achievementSections.find((section) => section.id === achievement.section_id)?.title ?? 'Без раздела'

  return <CrudEditor title="Достижения" subtitle="Дипломы, благодарственные письма, награды, публикации и сертификаты" items={items} editingId={editing.id} onEdit={setEditing} getMeta={sectionName} onDelete={async (id) => { if (confirm('Удалить достижение?')) { await supabase.from('achievements').delete().eq('id', id); await load() } }}>
    <form className="editor-form" onSubmit={save}>
      <Field label="Раздел достижения">
        <select value={editing.section_id ?? ''} onChange={(e) => setEditing({ ...editing, section_id: e.target.value || null })} required>
          <option value="" disabled>{achievementSections.length ? 'Выберите раздел' : 'Сначала создайте раздел типа «Достижения»'}</option>
          {achievementSections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
        </select>
      </Field>
      {!achievementSections.length && <p className="field-hint">Откройте вкладку «Разделы», создайте раздел с типом «Достижения», затем вернитесь сюда.</p>}
      <Field label="Название"><input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
      <div className="form-grid two"><Field label="Организация / источник"><input value={editing.issuer ?? ''} onChange={(e) => setEditing({ ...editing, issuer: e.target.value })} /></Field><Field label="Дата или год"><input value={editing.achievement_date ?? ''} onChange={(e) => setEditing({ ...editing, achievement_date: e.target.value })} /></Field></div>
      <Field label="Описание"><textarea rows={5} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
      <Field label="Изображение диплома или письма — URL"><input placeholder="Загрузите изображение во вкладке «Медиа» и вставьте ссылку" value={editing.image_url ?? ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></Field>
      <p className="field-hint">Изображение будет показано прямо на странице. По нажатию оно откроется в полном размере.</p>
      <Field label="PDF сертификата или диплома — URL"><input placeholder="Загрузите PDF во вкладке «Медиа» и вставьте ссылку" value={editing.pdf_url ?? ''} onChange={(e) => setEditing({ ...editing, pdf_url: e.target.value })} /></Field>
      <p className="field-hint">Если указать PDF, на публичной странице появится кнопка «Скачать PDF». Изображение и PDF можно использовать одновременно.</p>
      <div className="form-grid two"><Field label="Внешняя ссылка"><input placeholder="Например, ссылка на публикацию или страницу премии" value={editing.link_url ?? ''} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} /></Field><Field label="Порядок"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field></div>
      <PublishToggle checked={editing.is_published ?? true} set={(value) => setEditing({ ...editing, is_published: value })} />
      <FormActions cancel={() => resetEditor()} />
    </form>
  </CrudEditor>
}

function MediaManager({ userId, setNotice }: { userId: string; setNotice: (value: string) => void }) {
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  async function upload(file: File) {
    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isAllowed) { setNotice('Можно загружать только изображения и PDF'); return }
    if (file.size > 25 * 1024 * 1024) { setNotice('Файл больше 25 МБ. Уменьшите его и попробуйте снова.'); return }
    setUploading(true)
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${userId}/${Date.now()}-${clean}`
    const { error } = await supabase.storage.from('portfolio-media').upload(path, file, { upsert: false })
    if (error) { setNotice(error.message); setUploading(false); return }
    const { data } = supabase.storage.from('portfolio-media').getPublicUrl(path)
    setUrl(data.publicUrl)
    setNotice('Файл загружен. Скопируйте ссылку.')
    setUploading(false)
  }
  return <EditorPanel title="Медиафайлы" subtitle="Загрузите изображение или PDF и вставьте полученную ссылку в нужное поле.">
    <label className="upload-box"><div className="upload-icons"><ImagePlus size={34} /><FileUp size={34} /></div><strong>{uploading ? 'Загружаем…' : 'Выберите изображение или PDF'}</strong><span>JPG, PNG, WebP, PDF · до 25 МБ</span><input type="file" accept="image/*,application/pdf,.pdf" disabled={uploading} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} /></label>
    {url && <div className="url-box"><input readOnly value={url} /><button className="button secondary" onClick={() => void navigator.clipboard.writeText(url)}>Копировать</button></div>}
  </EditorPanel>
}

type EditorProps = { portfolio: Portfolio; userId: string; setNotice: (value: string) => void }
function EditorPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="editor-panel"><header><span className="eyebrow">Редактор</span><h2>{title}</h2><p>{subtitle}</p></header>{children}</div> }
function CrudEditor<T extends { id: string; title: string; is_published: boolean }>({ title, subtitle, items, editingId, onEdit, onDelete, getMeta, children }: { title: string; subtitle: string; items: T[]; editingId?: string; onEdit: (item: T) => void; onDelete: (id: string) => void; getMeta?: (item: T) => string; children: React.ReactNode }) { return <EditorPanel title={title} subtitle={subtitle}><div className="crud-grid"><div className="item-list">{items.map((item) => <div className={`item-row ${editingId === item.id ? 'active' : ''}`} key={item.id}><button onClick={() => onEdit(item)}><strong>{item.title}</strong><span>{getMeta ? `${getMeta(item)} · ` : ''}{item.is_published ? 'Опубликовано' : 'Черновик'}</span></button><button className="icon-button" onClick={() => onDelete(item.id)}><Trash2 size={17} /></button></div>)}{!items.length && <div className="mini-empty">Пока пусто</div>}</div><div className="form-card">{children}</div></div></EditorPanel> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }
function ColorField({ label, value, set }: { label: string; value: string; set: (value: string) => void }) { return <Field label={label}><div className="color-input"><input type="color" value={value} onChange={(e) => set(e.target.value)} /><input value={value} onChange={(e) => set(e.target.value)} /></div></Field> }
function PublishToggle({ checked, set }: { checked: boolean; set: (value: boolean) => void }) { return <label className="toggle"><input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} /><span>Показывать на сайте</span></label> }
function FormActions({ cancel }: { cancel: () => void }) { return <div className="form-actions"><button className="button" type="submit"><Save size={18} /> Сохранить</button><button className="button ghost" type="button" onClick={cancel}>Новая запись</button></div> }
function lines(value: string) { return value.split('\n').map((line) => line.trim()).filter(Boolean) }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9а-яё-]+/gi, '-').replace(/^-+|-+$/g, '') }
