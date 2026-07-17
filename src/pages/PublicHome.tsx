import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Portfolio } from '../types'
import { Loading } from '../components/Loading'

export function PublicHome() {
  const [items, setItems] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const { data, error: queryError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (queryError) setError(queryError.message)
      setItems((data ?? []) as Portfolio[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <main className="page"><Loading /></main>

  return (
    <main className="page public-home">
      <section className="home-intro">
        <span className="eyebrow">Выбранные работы</span>
        <h1>Демедюк Александр Сергеевич</h1>
        <p>Портфолио, проекты и профессиональные достижения</p>
      </section>

      {error && <div className="notice error">{error}</div>}

      <section className="portfolio-grid">
        {items.map((portfolio) => (
          <Link
            className="portfolio-card"
            to={`/p/${portfolio.slug}`}
            key={portfolio.id}
            style={{ '--accent': portfolio.accent_color } as React.CSSProperties}
          >
            <div className="portfolio-cover">
              {portfolio.cover_url ? <img src={portfolio.cover_url} alt="" /> : <div className="cover-placeholder" />}
            </div>
            <div className="portfolio-card-copy">
              <div>
                <h2>{portfolio.name}</h2>
                <p>{portfolio.subtitle}</p>
              </div>
              <ArrowUpRight size={24} />
            </div>
          </Link>
        ))}
      </section>

      {!items.length && (
        <div className="empty-state">
          <h2>Пока нет опубликованных портфолио</h2>
          <p>Войдите в редактор и создайте первую подборку.</p>
          <Link className="button" to="/admin">Открыть редактор</Link>
        </div>
      )}
    </main>
  )
}
