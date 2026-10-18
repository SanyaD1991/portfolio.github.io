import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, ExternalLink, Mail } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Achievement, Portfolio, PortfolioSection, Project } from '../types'
import { Loading } from '../components/Loading'
import { Reveal } from '../components/Reveal'
import { Lightbox } from '../components/Lightbox'
import { VideoCard } from '../components/video'


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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const value = total > 0 ? Math.min(1, window.scrollY / total) : 0
      progressRef.current?.style.setProperty('--progress', String(value))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

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
    <main className="portfolio-page">
      <div className="scroll-progress" ref={progressRef} aria-hidden="true" />
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

      {sections.map((section, sectionIndex) => (
        <section className="content-section" id={`section-${section.id}`} key={section.id}>
          <Reveal className="section-heading">
            <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
            <h2>{section.title}</h2>
          </Reveal>

          {section.type === 'text' && (
            <div className="prose">
              {(section.body ?? '').split('\n').map((line, index) => <p key={index}>{line || '\u00A0'}</p>)}
            </div>
          )}

          {section.type === 'projects' && (
            <div className="project-grid">
              {projects.filter((project) => project.section_id === section.id).map((project, projectIndex) => (
                <Reveal as="article" className="project-card" key={project.id}>
                  <div className="project-image">
                    {project.cover_url ? <img src={project.cover_url} alt="" /> : <div className="cover-placeholder" />}
                  </div>
                  <div className="project-card-body">
                    <span className="project-number">{String(projectIndex + 1).padStart(2, '0')}</span>
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
                      {project.gallery?.length > 0 && <div className="gallery-strip">{project.gallery.map((url, imageIndex) => (
                        <button type="button" className="gallery-item" key={url} onClick={() => setLightbox({ images: project.gallery, index: imageIndex })} aria-label="Открыть изображение">
                          <img src={url} alt="" loading="lazy" />
                        </button>
                      ))}</div>}
                      {project.video_urls?.length > 0 && <div className="video-list">{project.video_urls.map((url) => <VideoCard url={url} poster={project.cover_url} key={url} />)}</div>}
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          )}

          {section.type === 'achievements' && (
            <div className="achievement-list">
              {achievements.filter((item) => item.section_id === section.id).map((item) => (
                <Reveal as="article" className={`achievement-card ${item.image_url ? 'has-image' : ''}`} key={item.id}>
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
                </Reveal>
              ))}
            </div>
          )}
        </section>
      ))}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onChange={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
        />
      )}

      <footer className="portfolio-footer">
        <h2>Обсудим новый проект?</h2>
        {portfolio.contact_email && <a href={`mailto:${portfolio.contact_email}`}><Mail size={20} /> {portfolio.contact_email}</a>}
      </footer>
    </main>
  )
}
