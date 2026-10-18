import { useRef, useState, type DragEvent } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FileText, GripVertical, ImagePlus, Link2, Loader2, Plus, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react'
import { parseVideoUrl } from '../components/video'
import { useFeedback } from './feedback'
import { SortableList, useDragSensors } from './SortableList'
import { isPdf, uploadMedia } from './upload'

function pickFiles(accept: string, multiple: boolean, onPick: (files: File[]) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.multiple = multiple
  input.onchange = () => onPick(Array.from(input.files ?? []))
  input.click()
}

function filesFrom(event: DragEvent) {
  return Array.from(event.dataTransfer.files ?? [])
}

type ImageFieldProps = {
  label: string
  hint?: string
  value: string | null | undefined
  onChange: (url: string) => void
  userId: string
  ratio?: string
}

/** Одно изображение: перетащите файл, нажмите или вставьте из буфера. */
export function ImageField({ label, hint, value, onChange, userId, ratio = '16 / 9' }: ImageFieldProps) {
  const { notify } = useFeedback()
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [manual, setManual] = useState(false)

  async function handle(files: File[]) {
    const file = files.find((item) => item.type.startsWith('image/'))
    if (!file) {
      if (files.length) notify('Нужно изображение: JPG, PNG или WebP.', 'error')
      return
    }
    setBusy(true)
    try {
      onChange(await uploadMedia(file, userId))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить файл', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="media-field">
      <span className="field-label">{label}</span>
      <div
        className={`dropzone ${over ? 'over' : ''} ${value ? 'filled' : ''}`}
        style={{ aspectRatio: ratio }}
        tabIndex={0}
        role="button"
        aria-label={`${label}: загрузить изображение`}
        onClick={() => !value && !busy && pickFiles('image/*', false, handle)}
        onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !value) { event.preventDefault(); pickFiles('image/*', false, handle) } }}
        onDragOver={(event) => { event.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); void handle(filesFrom(event)) }}
        onPaste={(event) => void handle(Array.from(event.clipboardData.files))}
      >
        {value ? (
          <>
            <img src={value} alt="" />
            <div className="dropzone-actions">
              <button type="button" className="chip" onClick={(event) => { event.stopPropagation(); pickFiles('image/*', false, handle) }}><RefreshCw size={15} /> Заменить</button>
              <button type="button" className="chip danger" onClick={(event) => { event.stopPropagation(); onChange('') }}><Trash2 size={15} /> Убрать</button>
            </div>
          </>
        ) : (
          <div className="dropzone-empty">
            <UploadCloud size={30} />
            <strong>Перетащите изображение сюда</strong>
            <span>или нажмите, чтобы выбрать файл · можно вставить из буфера</span>
          </div>
        )}
        {busy && <div className="dropzone-busy"><Loader2 size={26} className="spin" /> Загружаем и сжимаем…</div>}
      </div>
      <div className="media-field-foot">
        {hint && <small className="field-hint">{hint}</small>}
        <button type="button" className="link-btn" onClick={() => setManual((current) => !current)}><Link2 size={14} /> {manual ? 'Скрыть ссылку' : 'Указать ссылку'}</button>
      </div>
      {manual && <input className="input" placeholder="https://…" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />}
    </div>
  )
}

function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
  return (
    <div
      ref={setNodeRef}
      className={`thumb ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined }}
      {...attributes}
      {...listeners}
    >
      <img src={url} alt="" draggable={false} />
      <span className="thumb-grip"><GripVertical size={14} /></span>
      <button type="button" className="thumb-remove" aria-label="Удалить фото" onPointerDown={(event) => event.stopPropagation()} onClick={onRemove}><X size={14} /></button>
    </div>
  )
}

type GalleryFieldProps = { label: string; hint?: string; value: string[]; onChange: (urls: string[]) => void; userId: string }

/** Несколько изображений: загружаются пачкой, порядок меняется перетаскиванием. */
export function GalleryField({ label, hint, value, onChange, userId }: GalleryFieldProps) {
  const { notify } = useFeedback()
  const sensors = useDragSensors()
  const [pending, setPending] = useState(0)
  const [over, setOver] = useState(false)
  const current = useRef(value)
  current.current = value

  async function handle(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (!images.length) {
      if (files.length) notify('Нужны изображения: JPG, PNG или WebP.', 'error')
      return
    }
    setPending((count) => count + images.length)
    for (const file of images) {
      try {
        const url = await uploadMedia(file, userId)
        onChange([...current.current, url])
        current.current = [...current.current, url]
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Не удалось загрузить файл', 'error')
      } finally {
        setPending((count) => count - 1)
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over: target } = event
    if (!target || active.id === target.id) return
    onChange(arrayMove(value, value.indexOf(String(active.id)), value.indexOf(String(target.id))))
  }

  return (
    <div className="media-field">
      <div className="media-field-head">
        <span className="field-label">{label}{value.length > 0 && <em>{value.length}</em>}</span>
        {value.length > 0 && <button type="button" className="link-btn danger" onClick={() => onChange([])}><Trash2 size={14} /> Очистить</button>}
      </div>
      <div
        className={`gallery ${over ? 'over' : ''}`}
        onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setOver(true) } }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); setOver(false); void handle(filesFrom(event)) } }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value} strategy={rectSortingStrategy}>
            {value.map((url) => <Thumb key={url} url={url} onRemove={() => onChange(value.filter((item) => item !== url))} />)}
          </SortableContext>
        </DndContext>
        {Array.from({ length: pending }, (_, index) => <div className="thumb pending" key={`p${index}`}><Loader2 size={20} className="spin" /></div>)}
        <button type="button" className="thumb add" onClick={() => pickFiles('image/*', true, handle)}>
          <ImagePlus size={22} />
          <span>Добавить фото</span>
          <small>или перетащите сюда</small>
        </button>
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  )
}

type FileFieldProps = { label: string; hint?: string; value: string | null | undefined; onChange: (url: string) => void; userId: string }

/** PDF-документ. */
export function PdfField({ label, hint, value, onChange, userId }: FileFieldProps) {
  const { notify } = useFeedback()
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  async function handle(files: File[]) {
    const file = files.find(isPdf)
    if (!file) {
      if (files.length) notify('Нужен PDF-файл.', 'error')
      return
    }
    setBusy(true)
    try {
      onChange(await uploadMedia(file, userId, 'pdf'))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось загрузить файл', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="media-field">
      <span className="field-label">{label}</span>
      <div
        className={`file-row ${over ? 'over' : ''} ${value ? 'filled' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); void handle(filesFrom(event)) }}
      >
        <FileText size={22} />
        {value ? (
          <>
            <a href={value} target="_blank" rel="noreferrer" className="file-name">PDF загружен · открыть</a>
            <button type="button" className="chip" onClick={() => pickFiles('application/pdf,.pdf', false, handle)}><RefreshCw size={15} /> Заменить</button>
            <button type="button" className="chip danger" onClick={() => onChange('')}><Trash2 size={15} /> Убрать</button>
          </>
        ) : (
          <>
            <span className="file-name muted">{busy ? 'Загружаем…' : 'Перетащите PDF сюда или выберите файл'}</span>
            <button type="button" className="chip" disabled={busy} onClick={() => pickFiles('application/pdf,.pdf', false, handle)}>
              {busy ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />} Выбрать PDF
            </button>
          </>
        )}
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  )
}

type VideoRow = { id: string; url: string }
let rowCounter = 0
const makeRow = (url = ''): VideoRow => ({ id: `v${++rowCounter}`, url })

type VideoLinksProps = { label: string; hint?: string; value: string[]; onChange: (urls: string[]) => void }

/** Ссылки на видео: каждая в своей строке, видно, распознана ли ссылка. Компонент нужно пересоздавать (key) при смене записи. */
export function VideoLinksField({ label, hint, value, onChange }: VideoLinksProps) {
  const [rows, setRows] = useState<VideoRow[]>(() => value.map((url) => makeRow(url)))

  function commit(next: VideoRow[]) {
    setRows(next)
    onChange(next.map((row) => row.url.trim()).filter(Boolean))
  }

  function edit(id: string, url: string) {
    const parts = url.split(/\s*\n\s*/).filter(Boolean)
    if (parts.length > 1) {
      const index = rows.findIndex((row) => row.id === id)
      commit([...rows.slice(0, index), ...parts.map((part) => makeRow(part)), ...rows.slice(index + 1)])
      return
    }
    commit(rows.map((row) => (row.id === id ? { ...row, url } : row)))
  }

  return (
    <div className="media-field">
      <div className="media-field-head">
        <span className="field-label">{label}{rows.length > 0 && <em>{rows.length}</em>}</span>
      </div>
      <SortableList items={rows} onReorder={commit} className="video-rows" itemClassName="video-row-wrap">
        {(row, { handle, dragging }) => {
          const parsed = row.url.trim() ? parseVideoUrl(row.url) : null
          const status = !row.url.trim() ? null : parsed ? (parsed.kind === 'file' ? 'Видеофайл' : parsed.provider) : 'Не распознано'
          return (
            <div className={`video-row ${dragging ? 'dragging' : ''}`}>
              <button type="button" className="drag-handle" aria-label="Перетащить" {...handle}><GripVertical size={16} /></button>
              <input className="input" placeholder="Ссылка на видео: YouTube, Google Drive, Vimeo, Rutube, VK…" value={row.url} onChange={(event) => edit(row.id, event.target.value)} />
              {status && <span className={`badge ${parsed ? 'ok' : 'warn'}`} title={parsed ? 'Ссылка распознана, видео откроется на сайте' : 'Ссылка не распознана — на сайте будет обычная ссылка'}>{status}</span>}
              <button type="button" className="icon-btn" aria-label="Удалить ссылку" onClick={() => commit(rows.filter((item) => item.id !== row.id))}><Trash2 size={16} /></button>
            </div>
          )
        }}
      </SortableList>
      <button type="button" className="btn ghost small" onClick={() => commit([...rows, makeRow()])}><Plus size={16} /> Добавить видео</button>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  )
}
