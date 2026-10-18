import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function Modal({ onClose, children, wide = false }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="modal-close" type="button" aria-label="Закрыть" onClick={onClose}><X size={22} /></button>
      <div className={`modal-body ${wide ? 'wide' : ''}`} onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  )
}

type LightboxProps = {
  images: string[]
  index: number
  onChange: (next: number) => void
  onClose: () => void
}

export function Lightbox({ images, index, onChange, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') onChange((index + 1) % images.length)
      if (event.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onChange])

  return (
    <Modal onClose={onClose} wide>
      <img className="lightbox-image" src={images[index]} alt="" />
      {images.length > 1 && (
        <>
          <button className="lightbox-nav prev" type="button" aria-label="Назад" onClick={() => onChange((index - 1 + images.length) % images.length)}><ChevronLeft size={26} /></button>
          <button className="lightbox-nav next" type="button" aria-label="Вперёд" onClick={() => onChange((index + 1) % images.length)}><ChevronRight size={26} /></button>
          <span className="lightbox-count">{index + 1} / {images.length}</span>
        </>
      )}
    </Modal>
  )
}
