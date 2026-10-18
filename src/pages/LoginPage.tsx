import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './auth-context'

export function LoginPage() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/admin" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? error.message : 'Вход выполнен')
    setSubmitting(false)
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Закрытая зона</span>
        <h1>Вход в редактор</h1>
        <label className="field"><span className="field-label">Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field"><span className="field-label">Пароль</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn primary" disabled={submitting}>{submitting ? 'Входим…' : 'Войти'}</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </main>
  )
}
