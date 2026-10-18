import type { ReactNode } from 'react'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  )
}

export function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field-group">
      <div className="field-group-head">
        <span className="field-label">{title}</span>
        {hint && <small className="field-hint">{hint}</small>}
      </div>
      {children}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch-track"><i /></span>
      <span className="switch-copy"><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
    </label>
  )
}

export function Card({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="admin-card">
      <header className="admin-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions}
    </header>
  )
}

