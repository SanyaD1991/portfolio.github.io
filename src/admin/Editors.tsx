import { useEffect, useState, type FormEvent } from 'react'
import { AlignLeft, Award, ExternalLink, LayoutGrid, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Achievement, Portfolio, PortfolioSection, Project, SectionType } from '../types'
import { useFeedback } from './feedback'
import { GalleryField, ImageField, PdfField, VideoLinksField } from './MediaFields'
import { SortableList } from './SortableList'
import { Card, Field, PageHead, Toggle } from './ui'
import { useDraftState } from './useDraft'
import { useCollection } from './useCollection'
import { DragHint, EditorBar, EmptyHint, ListCard, ListHead, Workspace } from './Workspace'

export type EditorProps = { portfolio: Portfolio; userId: string }

const sectionTypes: { value: SectionType; label: string; text: string; icon: JSX.Element }[] = [
  { value: 'text', label: 'Текст', text: 'Абзацы о себе или направлении', icon: <AlignLeft size={20} /> },
  { value: 'projects', label: 'Проекты', text: 'Карточки с фото, видео и ссылкой', icon: <LayoutGrid size={20} /> },
  { value: 'achievements', label: 'Достижения', text: 'Дипломы, сертификаты, награды', icon: <Award size={20} /> },
]

const sectionIcon = (type: SectionType) => sectionTypes.find((item) => item.value === type)?.icon

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9а-яё-]+/gi, '-').replace(/^-+|-+$/g, '')
}

function useUnsavedGuard(dirty: boolean) {
  const { confirm } = useFeedback()
  return async () => !dirty || confirm('Есть несохранённые изменения. Перейти без сохранения?', { confirmLabel: 'Перейти' })
}

/* ---------------- Основное ---------------- */

type SettingsForm = Pick<Portfolio, 'name' | 'slug' | 'subtitle' | 'about' | 'cover_url' | 'contact_email' | 'is_published'>

const pickSettings = (portfolio: Portfolio): SettingsForm => ({
  name: portfolio.name, slug: portfolio.slug, subtitle: portfolio.subtitle ?? '', about: portfolio.about ?? '',
  cover_url: portfolio.cover_url ?? '', contact_email: portfolio.contact_email ?? '', is_published: portfolio.is_published,
})

type SettingsProps = EditorProps & { onSaved: () => Promise<void>; onDeleted: () => Promise<void> }

export function SettingsEditor({ portfolio, userId, onSaved, onDeleted }: SettingsProps) {
  const { notify, confirm } = useFeedback()
  const { draft, patch, dirty, reset } = useDraftState<SettingsForm>(pickSettings(portfolio))
  const [saving, setSaving] = useState(false)

  useEffect(() => reset(pickSettings(portfolio)), [portfolio, reset])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('portfolios').update(draft).eq('id', portfolio.id)
    setSaving(false)
    if (error) return notify(error.message, 'error')
    notify('Настройки сохранены')
    await onSaved()
  }

  async function remove() {
    const ok = await confirm(`Удалить портфолио «${portfolio.name}» вместе со всеми разделами, проектами и достижениями? Это нельзя отменить.`, { danger: true, confirmLabel: 'Удалить навсегда' })
    if (!ok) return
    const { error } = await supabase.from('portfolios').delete().eq('id', portfolio.id)
    if (error) return notify(error.message, 'error')
    notify('Портфолио удалено')
    await onDeleted()
  }

  return (
    <>
      <PageHead eyebrow="Портфолио" title={portfolio.name || 'Без названия'} subtitle="Название, обложка и адрес страницы. Порядок карточек на главной меняется перетаскиванием в левой колонке." />
      <form className="form-stack" onSubmit={submit}>
        <Card title="Карточка на главной" subtitle="Так портфолио выглядит в списке направлений">
          <div className="grid-2">
            <div className="form-stack">
              <Field label="Название"><input className="input" value={draft.name} onChange={(event) => patch({ name: event.target.value })} required /></Field>
              <Field label="Короткий подзаголовок" hint="Одна строка под названием на карточке"><input className="input" value={draft.subtitle ?? ''} onChange={(event) => patch({ subtitle: event.target.value })} /></Field>
            </div>
            <ImageField label="Обложка" ratio="16 / 10" userId={userId} value={draft.cover_url} onChange={(url) => patch({ cover_url: url })} hint="Подойдёт горизонтальная картинка" />
          </div>
        </Card>
        <Card title="Страница портфолио">
          <Field label="Описание" hint="Появится в шапке страницы под названием"><textarea className="input" rows={5} value={draft.about ?? ''} onChange={(event) => patch({ about: event.target.value })} /></Field>
          <div className="grid-2">
            <Field label="Адрес страницы" hint={`…/p/${draft.slug || 'адрес'}`}><input className="input" value={draft.slug} onChange={(event) => patch({ slug: slugify(event.target.value) })} required /></Field>
            <Field label="Контактный email" hint="Показывается внизу страницы"><input className="input" type="email" value={draft.contact_email ?? ''} onChange={(event) => patch({ contact_email: event.target.value })} /></Field>
          </div>
        </Card>
        <Card title="Публикация">
          <Toggle checked={draft.is_published} onChange={(value) => patch({ is_published: value })} label="Опубликовано" hint="Выключите, чтобы скрыть портфолио с сайта: оно станет черновиком" />
        </Card>
        <Card title="Опасная зона">
          <div className="danger-zone">
            <p>Удаление портфолио уберёт всё его содержимое. Загруженные файлы в хранилище останутся.</p>
            <button type="button" className="btn danger" onClick={remove}><Trash2 size={16} /> Удалить портфолио</button>
          </div>
        </Card>
        <EditorBar dirty={dirty} saving={saving} isNew={false} />
      </form>
    </>
  )
}

/* ---------------- Разделы ---------------- */

const blankSection = (): Partial<PortfolioSection> => ({ title: '', type: 'text', body: '', is_published: true })

export function SectionsEditor({ portfolio, userId }: EditorProps) {
  const { notify, confirm } = useFeedback()
  const collection = useCollection<PortfolioSection>('sections', portfolio.id, userId)
  const { draft, patch, dirty, reset } = useDraftState<Partial<PortfolioSection>>(blankSection())
  const [saving, setSaving] = useState(false)
  const guard = useUnsavedGuard(dirty)

  useEffect(() => reset(blankSection()), [portfolio.id, reset])

  async function startNew() {
    if (await guard()) reset({ ...blankSection(), sort_order: collection.nextOrder() })
  }

  async function select(item: PortfolioSection) {
    if (await guard()) reset(item)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const saved = await collection.save({ sort_order: collection.nextOrder(), ...draft })
    setSaving(false)
    if (saved) {
      reset(saved)
      notify('Раздел сохранён')
    }
  }

  async function remove() {
    const ok = await confirm(`Удалить раздел «${draft.title}»? Проекты и достижения из него не удалятся, но пропадут с сайта, пока вы не назначите им другой раздел.`, { danger: true, confirmLabel: 'Удалить' })
    if (ok && draft.id && await collection.remove(draft.id)) {
      reset(blankSection())
      notify('Раздел удалён')
    }
  }

  return (
    <>
      <PageHead eyebrow="Структура страницы" title="Разделы" subtitle="Разделы идут на странице сверху вниз в том же порядке, что и в списке слева." />
      <Workspace
        list={(
          <>
            <ListHead title="Разделы" count={collection.items.length} onAdd={startNew} />
            {collection.items.length > 0 && <DragHint />}
            <SortableList items={collection.items} onReorder={(next) => void collection.reorder(next)} className="list-stack">
              {(item, { handle, dragging }) => (
                <ListCard handle={handle} dragging={dragging} active={draft.id === item.id} title={item.title} icon={sectionIcon(item.type)}
                  meta={sectionTypes.find((type) => type.value === item.type)?.label} published={item.is_published} onClick={() => void select(item)} />
              )}
            </SortableList>
            {!collection.loading && !collection.items.length && <EmptyHint title="Пока нет разделов" text="Создайте первый раздел: текст, проекты или достижения." />}
          </>
        )}
      >
        <form className="form-stack" onSubmit={submit}>
          <Card title={draft.id ? 'Редактирование раздела' : 'Новый раздел'}>
            <Field label="Заголовок"><input className="input" value={draft.title ?? ''} onChange={(event) => patch({ title: event.target.value })} required /></Field>
            <div className="field">
              <span className="field-label">Тип раздела</span>
              <div className="type-picker">
                {sectionTypes.map((type) => (
                  <button type="button" key={type.value} className={`type-option ${draft.type === type.value ? 'active' : ''}`} onClick={() => patch({ type: type.value })}>
                    {type.icon}<strong>{type.label}</strong><small>{type.text}</small>
                  </button>
                ))}
              </div>
            </div>
            {draft.type === 'text' && <Field label="Текст" hint="Каждая новая строка станет отдельным абзацем"><textarea className="input" rows={9} value={draft.body ?? ''} onChange={(event) => patch({ body: event.target.value })} /></Field>}
            <Toggle checked={draft.is_published ?? true} onChange={(value) => patch({ is_published: value })} label="Показывать на сайте" />
          </Card>
          <EditorBar dirty={dirty} saving={saving} isNew={!draft.id} onDelete={remove} />
        </form>
      </Workspace>
    </>
  )
}

/* ---------------- Группы записей по разделам ---------------- */

type Grouped<T> = { key: string; title: string; items: T[] }[]

function groupBySection<T extends { section_id: string | null }>(sections: PortfolioSection[], items: T[]): Grouped<T> {
  const groups: Grouped<T> = sections.map((section) => ({ key: section.id, title: section.title, items: items.filter((item) => item.section_id === section.id) }))
  const orphans = items.filter((item) => !item.section_id || !sections.some((section) => section.id === item.section_id))
  if (orphans.length) groups.push({ key: 'none', title: 'Без раздела (не показываются на сайте)', items: orphans })
  return groups
}

/* ---------------- Проекты ---------------- */

const blankProject = (sectionId: string | null): Partial<Project> => ({
  section_id: sectionId, title: '', summary: '', description: '', year: '', role: '', cover_url: '', project_url: '',
  gallery: [], video_urls: [], tags: [], is_published: true,
})

type SwitchTab = { goToSections: () => void }

export function ProjectsEditor({ portfolio, userId, goToSections }: EditorProps & SwitchTab) {
  const { notify, confirm } = useFeedback()
  const sections = useCollection<PortfolioSection>('sections', portfolio.id, userId)
  const collection = useCollection<Project>('projects', portfolio.id, userId)
  const projectSections = sections.items.filter((section) => section.type === 'projects')
  const { draft, patch, dirty, reset } = useDraftState<Partial<Project>>(blankProject(null))
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const guard = useUnsavedGuard(dirty)

  useEffect(() => {
    reset(blankProject(null))
    setOpen(false)
  }, [portfolio.id, reset])

  async function startNew(sectionId?: string | null) {
    if (!(await guard())) return
    reset({ ...blankProject(sectionId ?? draft.section_id ?? projectSections[0]?.id ?? null), sort_order: collection.nextOrder() })
    setOpen(true)
  }

  async function select(item: Project) {
    if (!(await guard())) return
    reset(item)
    setOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.section_id) return notify('Выберите раздел для проекта', 'error')
    setSaving(true)
    const saved = await collection.save({ sort_order: collection.nextOrder(), ...draft })
    setSaving(false)
    if (saved) {
      reset(saved)
      notify('Проект сохранён')
    }
  }

  async function remove() {
    const ok = await confirm(`Удалить проект «${draft.title}»?`, { danger: true, confirmLabel: 'Удалить' })
    if (ok && draft.id && await collection.remove(draft.id)) {
      reset(blankProject(draft.section_id ?? null))
      setOpen(false)
      notify('Проект удалён')
    }
  }

  const groups = groupBySection(projectSections, collection.items)

  return (
    <>
      <PageHead eyebrow="Содержимое" title="Проекты" subtitle="Выберите проект слева или создайте новый. Порядок внутри раздела меняется перетаскиванием." />
      {!sections.loading && !projectSections.length ? (
        <EmptyHint title="Сначала нужен раздел типа «Проекты»" text="Проекты показываются внутри разделов страницы. Создайте раздел и вернитесь сюда." action={<button type="button" className="btn primary" onClick={goToSections}>Создать раздел</button>} />
      ) : (
        <Workspace
          list={(
            <>
              <ListHead title="Проекты" count={collection.items.length} onAdd={() => void startNew()} />
              {collection.items.length > 1 && <DragHint />}
              {groups.map((group) => (
                <div className="list-group" key={group.key}>
                  <div className="list-group-title"><span>{group.title}</span><em>{group.items.length}</em></div>
                  <SortableList items={group.items} onReorder={(next) => void collection.reorder(next)} className="list-stack">
                    {(item, { handle, dragging }) => (
                      <ListCard handle={handle} dragging={dragging} active={draft.id === item.id} title={item.title} thumb={item.cover_url}
                        meta={[item.year, item.role].filter(Boolean).join(' · ') || undefined} published={item.is_published} onClick={() => void select(item)} />
                    )}
                  </SortableList>
                  {group.key !== 'none' && <button type="button" className="add-inline" onClick={() => void startNew(group.key)}>+ Проект в этот раздел</button>}
                </div>
              ))}
            </>
          )}
        >
          {!open ? (
            <EmptyHint title="Выберите проект" text="Нажмите на проект в списке слева или создайте новый." action={<button type="button" className="btn primary" onClick={() => void startNew()}>Новый проект</button>} />
          ) : (
            <form className="form-stack" onSubmit={submit} key={draft.id ?? 'new'}>
              <Card title={draft.id ? 'Редактирование проекта' : 'Новый проект'}>
                <div className="grid-2">
                  <Field label="Раздел">
                    <select className="input" value={draft.section_id ?? ''} onChange={(event) => patch({ section_id: event.target.value || null })} required>
                      <option value="" disabled>Выберите раздел</option>
                      {projectSections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Название"><input className="input" value={draft.title ?? ''} onChange={(event) => patch({ title: event.target.value })} required /></Field>
                </div>
                <div className="grid-2">
                  <Field label="Год"><input className="input" value={draft.year ?? ''} onChange={(event) => patch({ year: event.target.value })} /></Field>
                  <Field label="Роль"><input className="input" value={draft.role ?? ''} onChange={(event) => patch({ role: event.target.value })} /></Field>
                </div>
                <Field label="Короткое описание" hint="Видно сразу на карточке"><textarea className="input" rows={3} value={draft.summary ?? ''} onChange={(event) => patch({ summary: event.target.value })} /></Field>
                <Field label="Подробное описание" hint="Раскрывается по кнопке «Подробнее»"><textarea className="input" rows={6} value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} /></Field>
              </Card>
              <Card title="Изображения">
                <ImageField label="Обложка проекта" ratio="16 / 9" userId={userId} value={draft.cover_url} onChange={(url) => patch({ cover_url: url })} hint="Картинки автоматически сжимаются при загрузке" />
                <GalleryField label="Галерея" userId={userId} value={draft.gallery ?? []} onChange={(gallery) => patch({ gallery })} hint="Можно выбрать сразу несколько файлов. Порядок меняется перетаскиванием." />
              </Card>
              <Card title="Видео и ссылки">
                <VideoLinksField key={draft.id ?? 'new'} label="Видео" value={draft.video_urls ?? []} onChange={(video_urls) => patch({ video_urls })} hint="Работают YouTube, Google Drive, Vimeo, Rutube, VK Видео и прямые ссылки на .mp4. Посетитель смотрит видео во всплывающем окне." />
                <div className="grid-2">
                  <Field label="Ссылка на проект" hint="Сайт, приложение или статья. Если пусто — кнопки не будет"><input className="input" type="url" placeholder="https://…" value={draft.project_url ?? ''} onChange={(event) => patch({ project_url: event.target.value })} /></Field>
                  <Field label="Теги" hint="Через запятую"><input className="input" value={(draft.tags ?? []).join(', ')} onChange={(event) => patch({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></Field>
                </div>
              </Card>
              <Card title="Публикация">
                <Toggle checked={draft.is_published ?? true} onChange={(value) => patch({ is_published: value })} label="Показывать на сайте" />
              </Card>
              <EditorBar dirty={dirty} saving={saving} isNew={!draft.id} onDelete={remove} />
            </form>
          )}
        </Workspace>
      )}
    </>
  )
}

/* ---------------- Достижения ---------------- */

const blankAchievement = (sectionId: string | null): Partial<Achievement> => ({
  section_id: sectionId, title: '', issuer: '', achievement_date: '', description: '', image_url: '', pdf_url: '', link_url: '', is_published: true,
})

export function AchievementsEditor({ portfolio, userId, goToSections }: EditorProps & SwitchTab) {
  const { notify, confirm } = useFeedback()
  const sections = useCollection<PortfolioSection>('sections', portfolio.id, userId)
  const collection = useCollection<Achievement>('achievements', portfolio.id, userId)
  const achievementSections = sections.items.filter((section) => section.type === 'achievements')
  const { draft, patch, dirty, reset } = useDraftState<Partial<Achievement>>(blankAchievement(null))
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const guard = useUnsavedGuard(dirty)

  useEffect(() => {
    reset(blankAchievement(null))
    setOpen(false)
  }, [portfolio.id, reset])

  async function startNew(sectionId?: string | null) {
    if (!(await guard())) return
    reset({ ...blankAchievement(sectionId ?? draft.section_id ?? achievementSections[0]?.id ?? null), sort_order: collection.nextOrder() })
    setOpen(true)
  }

  async function select(item: Achievement) {
    if (!(await guard())) return
    reset(item)
    setOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.section_id) return notify('Выберите раздел для достижения', 'error')
    setSaving(true)
    const saved = await collection.save({ sort_order: collection.nextOrder(), ...draft })
    setSaving(false)
    if (saved) {
      reset(saved)
      notify('Достижение сохранено')
    }
  }

  async function remove() {
    const ok = await confirm(`Удалить достижение «${draft.title}»?`, { danger: true, confirmLabel: 'Удалить' })
    if (ok && draft.id && await collection.remove(draft.id)) {
      reset(blankAchievement(draft.section_id ?? null))
      setOpen(false)
      notify('Достижение удалено')
    }
  }

  const groups = groupBySection(achievementSections, collection.items)

  return (
    <>
      <PageHead eyebrow="Содержимое" title="Достижения" subtitle="Дипломы, сертификаты и награды. Порядок внутри раздела меняется перетаскиванием." />
      {!sections.loading && !achievementSections.length ? (
        <EmptyHint title="Сначала нужен раздел типа «Достижения»" text="Достижения показываются внутри разделов страницы. Создайте раздел и вернитесь сюда." action={<button type="button" className="btn primary" onClick={goToSections}>Создать раздел</button>} />
      ) : (
        <Workspace
          list={(
            <>
              <ListHead title="Достижения" count={collection.items.length} onAdd={() => void startNew()} />
              {collection.items.length > 1 && <DragHint />}
              {groups.map((group) => (
                <div className="list-group" key={group.key}>
                  <div className="list-group-title"><span>{group.title}</span><em>{group.items.length}</em></div>
                  <SortableList items={group.items} onReorder={(next) => void collection.reorder(next)} className="list-stack">
                    {(item, { handle, dragging }) => (
                      <ListCard handle={handle} dragging={dragging} active={draft.id === item.id} title={item.title} thumb={item.image_url} icon={<Award size={18} />}
                        meta={[item.achievement_date, item.issuer].filter(Boolean).join(' · ') || undefined} published={item.is_published} onClick={() => void select(item)} />
                    )}
                  </SortableList>
                  {group.key !== 'none' && <button type="button" className="add-inline" onClick={() => void startNew(group.key)}>+ Достижение в этот раздел</button>}
                </div>
              ))}
            </>
          )}
        >
          {!open ? (
            <EmptyHint title="Выберите достижение" text="Нажмите на запись в списке слева или создайте новую." action={<button type="button" className="btn primary" onClick={() => void startNew()}>Новое достижение</button>} />
          ) : (
            <form className="form-stack" onSubmit={submit} key={draft.id ?? 'new'}>
              <Card title={draft.id ? 'Редактирование достижения' : 'Новое достижение'}>
                <div className="grid-2">
                  <Field label="Раздел">
                    <select className="input" value={draft.section_id ?? ''} onChange={(event) => patch({ section_id: event.target.value || null })} required>
                      <option value="" disabled>Выберите раздел</option>
                      {achievementSections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Название"><input className="input" value={draft.title ?? ''} onChange={(event) => patch({ title: event.target.value })} required /></Field>
                </div>
                <div className="grid-2">
                  <Field label="Организация / источник"><input className="input" value={draft.issuer ?? ''} onChange={(event) => patch({ issuer: event.target.value })} /></Field>
                  <Field label="Дата или год"><input className="input" value={draft.achievement_date ?? ''} onChange={(event) => patch({ achievement_date: event.target.value })} /></Field>
                </div>
                <Field label="Описание"><textarea className="input" rows={4} value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} /></Field>
              </Card>
              <Card title="Документ">
                <div className="grid-2">
                  <ImageField label="Фото или скан" ratio="4 / 5" userId={userId} value={draft.image_url} onChange={(url) => patch({ image_url: url })} hint="Показывается целиком, по клику открывается крупно" />
                  <div className="form-stack">
                    <PdfField label="PDF для скачивания" userId={userId} value={draft.pdf_url} onChange={(url) => patch({ pdf_url: url })} hint="На сайте появится кнопка «Скачать PDF»" />
                    <Field label="Внешняя ссылка" hint="Публикация, страница премии и т. п."><input className="input" placeholder="https://…" value={draft.link_url ?? ''} onChange={(event) => patch({ link_url: event.target.value })} /></Field>
                    {draft.link_url && <a className="link-btn" href={draft.link_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Проверить ссылку</a>}
                  </div>
                </div>
              </Card>
              <Card title="Публикация">
                <Toggle checked={draft.is_published ?? true} onChange={(value) => patch({ is_published: value })} label="Показывать на сайте" />
              </Card>
              <EditorBar dirty={dirty} saving={saving} isNew={!draft.id} onDelete={remove} />
            </form>
          )}
        </Workspace>
      )}
    </>
  )
}
