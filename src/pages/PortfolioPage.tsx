import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, ExternalLink, Mail } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Achievement, Portfolio, PortfolioSection, Project } from '../types'
import { Loading } from '../components/Loading'


type ParsedVideo =
  | { kind: 'file'; src: string }
  | { kind: 'embed'; src: string; title: string }

function VideoPlayer({ url }: { url: string }) {
  const video = parseVideoUrl(url)

  if (!video) {
    return <a className="video-fallback" href={url} target="_blank" rel="noreferrer">Открыть видео</a>
  }

  if (video.kind === 'file') {
    return (
      <div className="video-frame">
        <video controls preload="metadata" playsInline>
          <source src={video.src} />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      </div>
    )
  }

  return (
    <div className="video-frame">
      <iframe
        src={video.src}
        title={video.title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

function parseVideoUrl(value: string): ParsedVideo | null {
  const raw = value.trim()
  if (!raw) return null

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const pathname = url.pathname

  if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(normalized)) {
    return { kind: 'file', src: normalized }
  }

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const parts = pathname.split('/').filter(Boolean)
    const id = host === 'youtu.be'
      ? parts[0]
      : url.searchParams.get('v') ?? (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : '')
    if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}`, title: 'Видео YouTube' }
  }

  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = pathname.split('/').filter(Boolean).reverse().find((part) => /^\d+$/.test(part))
    if (id) return { kind: 'embed', src: `https://player.vimeo.com/video/${id}`, title: 'Видео Vimeo' }
  }

  if (host === 'rutube.ru' || host.endsWith('.rutube.ru')) {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] === 'play' && parts[1] === 'embed' && parts[2]) {
      return { kind: 'embed', src: normalized, title: 'Видео Rutube' }
    }
    const videoIndex = parts.findIndex((part) => part === 'video' || part === 'shorts')
    const id = videoIndex >= 0 ? parts[videoIndex + 1] : ''
    if (id) return { kind: 'embed', src: `https://rutube.ru/play/embed/${id}/`, title: 'Видео Rutube' }
  }

  if (host === 'vk.com' || host === 'vkvideo.ru' || host.endsWith('.vk.com') || host.endsWith('.vkvideo.ru')) {
    if (pathname.includes('video_ext.php')) {
      return { kind: 'embed', src: normalized, title: 'VK Видео' }
    }
    const match = `${pathname}${url.search}`.match(/video(-?\d+)_(\d+)/)
    if (match) {
      return { kind: 'embed', src: `https://vkvideo.ru/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2`, title: 'VK Видео' }
    }
  }

  return null
}


async function downloadPdf(url: string, title: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('download failed')
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${title.trim().replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '-').replace(/^-+|-+$/g, '') || 'certificate'}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export function PortfolioPage() {
  const { slug } = useParams()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [sections, setSections] = useState<PortfolioSection[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSectionId, setActiveSectionId] = useState('')
  const [navDetached, setNavDetached] = useState(false)
  const heroRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void (async () => {
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (portfolioError || !portfolioData) {
        setError('Портфолио не найдено или не опубликовано.')
        setLoading(false)
        return
      }

      const current = portfolioData as Portfolio
      setPortfolio(current)

      const [sectionResult, projectResult, achievementResult] = await Promise.all([
        supabase.from('sections').select('*').eq('portfolio_id', current.id).eq('is_published', true).order('sort_order'),
        supabase.from('projects').select('*').eq('portfolio_id', current.id).eq('is_published', true).order('sort_order'),
        supabase.from('achievements').select('*').eq('portfolio_id', current.id).eq('is_published', true).order('sort_order'),
      ])

      setSections((sectionResult.data ?? []) as PortfolioSection[])
      setProjects((projectResult.data ?? []) as Project[])
      setAchievements((achievementResult.data ?? []) as Achievement[])
      setLoading(false)
    })()
  }, [slug])

  const theme = useMemo(() => ({
    '--portfolio-bg': portfolio?.background_color ?? '#f4f0e8',
    '--portfolio-text': portfolio?.text_color ?? '#161616',
    '--portfolio-accent': portfolio?.accent_color ?? '#d95d39',
  } as React.CSSProperties), [portfolio])

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSectionId('')
      return
    }

    setActiveSectionId((current) => current || sections[0].id)

    let frame = 0
    const updateNavigation = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const marker = Math.max(170, window.innerHeight * 0.3)
        let currentSection = sections[0].id

        for (const section of sections) {
          const element = document.getElementById(`section-${section.id}`)
          if (element && element.getBoundingClientRect().top <= marker) {
            currentSection = section.id
          }
        }

        setActiveSectionId(currentSection)

        const hero = heroRef.current
        if (hero) {
          const detachPoint = hero.offsetTop + hero.offsetHeight - 118
          setNavDetached(window.scrollY >= detachPoint)
        }
      })
    }

    updateNavigation()
    window.addEventListener('scroll', updateNavigation, { passive: true })
    window.addEventListener('resize', updateNavigation)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateNavigation)
      window.removeEventListener('resize', updateNavigation)
    }
  }, [sections])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`)
    if (!element) return

    setActiveSectionId(sectionId)
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#section-${sectionId}`)
  }

  if (loading) return <main className="page"><Loading /></main>
  if (error || !portfolio) return <main className="page"><div className="state-card">{error}</div></main>

  return (
    <main className="portfolio-page" style={theme}>
      <section ref={heroRef} className={`portfolio-hero ${portfolio.cover_url ? 'has-cover' : 'no-cover'}`}>
        <div
          className="portfolio-hero-banner"
          style={{ '--hero-image': portfolio.cover_url ? `url(${portfolio.cover_url})` : 'none' } as React.CSSProperties}
        >
          <div className="portfolio-hero-inner">
            <Link to="/" className="back-link hero-back-link"><ArrowLeft size={18} /> Все портфолио</Link>
            <div className="portfolio-hero-content">
              <span className="eyebrow">Портфолио</span>
              <h1>{portfolio.name}</h1>
              {(portfolio.subtitle || portfolio.about) && (
                <div className="portfolio-hero-copy">
                  {portfolio.subtitle && <p className="hero-subtitle">{portfolio.subtitle}</p>}
                  {portfolio.about && <p className="portfolio-about">{portfolio.about}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {sections.length > 0 && (
        <nav
          className={`portfolio-section-nav ${navDetached ? 'is-detached' : 'is-attached'}`}
          aria-label="Навигация по разделам портфолио"
        >
          <div className="portfolio-section-nav-inner">
            {sections.map((section, index) => {
              const isActive = activeSectionId === section.id
              return (
                <button
                  type="button"
                  className={isActive ? 'is-active' : ''}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => scrollToSection(section.id)}
                  key={section.id}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{section.title}</strong>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {sections.map((section) => (
        <section className="content-section" id={`section-${section.id}`} key={section.id}>
          <div className="section-heading">
            <span>{String(section.sort_order).padStart(2, '0')}</span>
            <h2>{section.title}</h2>
          </div>

          {section.type === 'text' && (
            <div className="prose">
              {(section.body ?? '').split('\n').map((line, index) => <p key={index}>{line || '\u00A0'}</p>)}
            </div>
          )}

          {section.type === 'projects' && (
            <div className="project-grid">
              {projects.filter((project) => project.section_id === section.id).map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-image">
                    {project.cover_url ? <img src={project.cover_url} alt="" /> : <div className="cover-placeholder" />}
                  </div>
                  <div className="project-card-body">
                    <div className="project-meta">
                      <span>{project.year}</span>
                      <span>{project.role}</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p className="project-summary">{project.summary}</p>
                    {project.tags?.length > 0 && <div className="tag-list">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                    {project.description && <details><summary>Подробнее</summary><p>{project.description}</p></details>}
                    {project.project_url && (
                      <a className="project-link" href={project.project_url} target="_blank" rel="noreferrer">
                        <ExternalLink size={18} /> Открыть проект
                      </a>
                    )}
                  </div>
                  {(project.gallery?.length > 0 || project.video_urls?.length > 0) && (
                    <div className="project-media">
                      {project.gallery?.length > 0 && <div className="gallery-strip">{project.gallery.map((url) => <img src={url} alt="" key={url} />)}</div>}
                      {project.video_urls?.length > 0 && <div className="video-list">{project.video_urls.map((url) => <VideoPlayer url={url} key={url} />)}</div>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {section.type === 'achievements' && (
            <div className="achievement-list">
              {achievements.filter((item) => item.section_id === section.id).map((item) => (
                <article className={`achievement-card ${item.image_url ? 'has-image' : ''}`} key={item.id}>
                  {item.image_url && (
                    <a className="achievement-image" href={item.image_url} target="_blank" rel="noreferrer" title="Открыть документ в полном размере">
                      <img src={item.image_url} alt={item.title} loading="lazy" />
                    </a>
                  )}
                  <div className="achievement-title">
                    <span>{item.achievement_date}</span>
                    <h3>{item.title}</h3>
                    {item.issuer && <p>{item.issuer}</p>}
                  </div>
                  <div className="achievement-description">
                    {item.description && <p>{item.description}</p>}
                    <div className="achievement-actions">
                      {item.pdf_url && <button className="achievement-link achievement-download" type="button" onClick={() => void downloadPdf(item.pdf_url!, item.title)}><Download size={18} /> Скачать PDF</button>}
                      {item.link_url && <a className="achievement-link" href={item.link_url} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Открыть ссылку</a>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}

      <footer className="portfolio-footer">
        <h2>Обсудим новый проект?</h2>
        {portfolio.contact_email && <a href={`mailto:${portfolio.contact_email}`}><Mail size={20} /> {portfolio.contact_email}</a>}
      </footer>
    </main>
  )
}
