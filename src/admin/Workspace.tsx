import type { ReactNode } from 'react'
import { GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import type { HandleProps } from './SortableList'

type ListCardProps = {
  handle: HandleProps
  dragging: boolean
  active: boolean
  title: string
  meta?: string
  thumb?: string | null
  icon?: ReactNode
  published: boolean
  onClick: () => void
}

export function ListCard({ handle, dragging, active, title, meta, thumb, icon, published, onClick }: ListCardProps) {
  return (
    <div className={`list-card ${active ? 'active' : ''} ${dragging ? 'dragging' : ''}`}>
      <button type="button" className="drag-handle" aria-label="Перетащить, чтобы изменить порядок" {...handle}><GripVertical size={16} /></button>
      <button type="button" className="list-card-body" onClick={onClick}>
        <span className="list-thumb">{thumb ? <img src={thumb} alt="" loading="lazy" /> : icon}</span>
        <span className="list-copy">
          <strong>{title || 'Без названия'}</strong>
          <small>{meta}</small>
        </span>
        <span className={`status-dot ${published ? 'on' : ''}`} title={published ? 'Опубликовано' : 'Черновик'} />
      </button>
    </div>
  )
}

export function Workspace({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="workspace">
      <aside className="workspace-list">{list}</aside>
      <section className="workspace-form">{children}</section>
    </div>
  )
}

export function ListHead({ title, count, onAdd, addLabel = 'Добавить' }: { title: string; count: number; onAdd: () => void; addLabel?: string }) {
  return (
    <div className="workspace-list-head">
      <strong>{title}<em>{count}</em></strong>
      <button type="button" className="btn primary small" onClick={onAdd}><Plus size={16} /> {addLabel}</button>
    </div>
  )
}

export function DragHint() {
  return <p className="drag-hint"><GripVertical size={14} /> Потяните за точки, чтобы изменить порядок на сайте</p>
}

type EditorBarProps = {
  dirty: boolean
  saving: boolean
  isNew: boolean
  onDelete?: () => void
  saveLabel?: string
}

export function EditorBar({ dirty, saving, isNew, onDelete, saveLabel = 'Сохранить' }: EditorBarProps) {
  return (
    <div className="editor-bar">
      <span className={`dirty ${dirty ? 'on' : ''}`}>{dirty ? 'Есть несохранённые изменения' : isNew ? 'Новая запись' : 'Все изменения сохранены'}</span>
      <div className="editor-bar-actions">
        {onDelete && !isNew && <button type="button" className="btn danger-ghost" onClick={onDelete}><Trash2 size={16} /> Удалить</button>}
        <button type="submit" className="btn primary" disabled={saving || (!dirty && !isNew)}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} {saving ? 'Сохраняем…' : saveLabel}
        </button>
      </div>
    </div>
  )
}

export function EmptyHint({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-hint">
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  )
}
