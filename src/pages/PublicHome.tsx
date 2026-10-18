import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Portfolio } from '../types'
import { Loading } from '../components/Loading'
import { Reveal } from '../components/Reveal'
import { CountUp } from '../components/CountUp'
import { HeroBackground } from '../components/HeroBackground'

const roles = ['Full-Stack Unity Developer', 'Видеопродакшен · After Effects · Cinema 4D']
const skills = ['Unity', 'C#', 'Full-Stack', 'React', 'TypeScript', 'Supabase', 'After Effects', 'Cinema 4D', 'Видеомонтаж', 'Motion design']

type Stats = { portfolios: number; projects: number; achievements: number }

function Typewriter({ words }: { words: string[] }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(words[0])
      return
    }
    let wordIndex = 0
    let length = 0
    let deleting = false
    let timer = 0
    const tick = () => {
      const word = words[wordIndex]
      length += deleting ? -1 : 1
      setText(word.slice(0, length))
      let delay = deleting ? 28 : 55
      if (!deleting && length === word.length) {
        deleting = true
        delay = 1800
      } else if (deleting && length === 0) {
        deleting = false
        wordIndex = (wordIndex + 1) % words.length
        delay = 350
      }
      timer = window.setTimeout(tick, delay)
    }
    timer = window.setTimeout(tick, 600)
    return () => window.clearTimeout(timer)
  }, [words])

  return <span className="typed">{text}<i className="caret" /></span>
}

async function countPublished(table: string) {
  const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_published', true)
  return count ?? 0
}

function spotlight(event: React.PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
}

export function PublicHome() {
  const [items, setItems] = useState<Portfolio[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
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
      const list = (data ?? []) as Portfolio[]
      setItems(list)
      setLoading(false)

      const [projects, achievements] = await Promise.all([countPublished('projects'), countPublished('achievements')])
      setStats({ portfolios: list.length, projects, achievements })
    })()
  }, [])

  if (loading) return <main className="page"><Loading /></main>

  return (
    <main className="public-home">
      <section className="home-hero">
        <HeroBackground />
        <div className="home-hero-glow" />
        <div className="home-hero-inner">
          <span className="eyebrow hero-fade" style={{ '--d': '0ms' } as React.CSSProperties}>Портфолио</span>
          <h1 className="hero-title" aria-label="Демедюк Александр Сергеевич">
            {['Демедюк', 'Александр', 'Сергеевич'].map((word, index) => (
              <span className="hero-word" key={word} style={{ '--d': `${150 + index * 130}ms` } as React.CSSProperties}>
                <span className={index === 1 ? 'accent' : ''}>{word}</span>
              </span>
            ))}
          </h1>
          <p className="hero-role hero-fade" style={{ '--d': '650ms' } as React.CSSProperties}>
            <span className="prompt">&gt;</span> <Typewriter words={roles} />
          </p>
          <div className="hero-actions hero-fade" style={{ '--d': '800ms' } as React.CSSProperties}>
            <a className="button" href="#works"><ArrowDown size={18} /> Смотреть работы</a>
          </div>
          {stats && (
            <dl className="hero-stats hero-fade" style={{ '--d': '950ms' } as React.CSSProperties}>
              <div><dt>Направлений</dt><dd><CountUp value={stats.portfolios} /></dd></div>
              <div><dt>Проектов</dt><dd><CountUp value={stats.projects} /></dd></div>
              <div><dt>Достижений</dt><dd><CountUp value={stats.achievements} /></dd></div>
            </dl>
          )}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...skills, ...skills].map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}
        </div>
      </div>

      <section className="works" id="works">
        <Reveal className="works-head">
          <span className="eyebrow">Направления</span>
          <h2>Выберите, что посмотреть</h2>
        </Reveal>

        {error && <div className="notice error">{error}</div>}

        <div className="bento">
          {items.map((portfolio, index) => (
            <Reveal key={portfolio.id} delay={(index % 3) * 90} className="bento-cell">
              <Link className="bento-card" to={`/p/${portfolio.slug}`} onPointerMove={spotlight}>
                {portfolio.cover_url
                  ? <img className="bento-image" src={portfolio.cover_url} alt="" loading="lazy" />
                  : <div className="cover-placeholder bento-image" />}
                <span className="bento-shade" />
                <span className="bento-spot" />
                <span className="portfolio-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="bento-copy">
                  <span>
                    <h3>{portfolio.name}</h3>
                    {portfolio.subtitle && <p>{portfolio.subtitle}</p>}
                  </span>
                  <span className="portfolio-card-arrow"><ArrowUpRight size={20} /></span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        {!items.length && (
          <div className="empty-state">
            <h2>Пока нет опубликованных портфолио</h2>
            <p>Войдите в редактор и создайте первую подборку.</p>
            <Link className="button" to="/admin">Открыть редактор</Link>
          </div>
        )}
      </section>
    </main>
  )
}
