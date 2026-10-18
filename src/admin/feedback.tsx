import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react'

type ToastKind = 'ok' | 'error'
type Toast = { id: number; kind: ToastKind; message: string }
type ConfirmOptions = { confirmLabel?: string; danger?: boolean }
type ConfirmState = { message: string; options: ConfirmOptions; resolve: (value: boolean) => void }

type Feedback = {
  notify: (message: string, kind?: ToastKind) => void
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<Feedback>({ notify: () => undefined, confirm: async () => false })

export function useFeedback() {
  return useContext(FeedbackContext)
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<ConfirmState | null>(null)
  const counter = useRef(0)

  const notify = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = ++counter.current
    setToasts((current) => [...current, { id, kind, message }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), kind === 'error' ? 7000 : 3200)
  }, [])

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => (
    new Promise<boolean>((resolve) => setDialog({ message, options, resolve }))
  ), [])

  const close = (value: boolean) => {
    dialog?.resolve(value)
    setDialog(null)
  }

  useEffect(() => {
    if (!dialog) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dialog.resolve(false)
        setDialog(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.kind}`} key={toast.id} role="status">
            {toast.kind === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{toast.message}</span>
            <button type="button" aria-label="Закрыть" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X size={15} /></button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="confirm-backdrop" onClick={() => close(false)}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={`confirm-icon ${dialog.options.danger ? 'danger' : ''}`}><AlertTriangle size={22} /></div>
            <p>{dialog.message}</p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" onClick={() => close(false)}>Отмена</button>
              <button type="button" className={`btn ${dialog.options.danger ? 'danger' : 'primary'}`} autoFocus onClick={() => close(true)}>
                {dialog.options.confirmLabel ?? 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}
