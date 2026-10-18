import { useEffect, useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { Modal } from './Lightbox'

type ParsedVideo =
  | { kind: 'file'; src: string }
  | { kind: 'embed'; src: string; title: string; provider: string; thumb?: string; oembed?: string; noAutoplay?: boolean }

export function parseVideoUrl(value: string): ParsedVideo | null {
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

  if (host === 'drive.google.com') {
    const parts = pathname.split('/').filter(Boolean)
    const id = parts[0] === 'file' && parts[1] === 'd' ? parts[2] : url.searchParams.get('id')
    if (id) {
      return {
        kind: 'embed',
        src: `https://drive.google.com/file/d/${id}/preview`,
        title: 'Видео Google Drive',
        provider: 'Google Drive',
        thumb: `https://lh3.googleusercontent.com/d/${id}=w640`,
        noAutoplay: true,
      }
    }
  }

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const parts = pathname.split('/').filter(Boolean)
    const id = host === 'youtu.be'
      ? parts[0]
      : url.searchParams.get('v') ?? (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : '')
    if (id) {
      return {
        kind: 'embed',
        src: `https://www.youtube-nocookie.com/embed/${id}`,
        title: 'Видео YouTube',
        provider: 'YouTube',
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      }
    }
  }

  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = pathname.split('/').filter(Boolean).reverse().find((part) => /^\d+$/.test(part))
    if (id) {
      return {
        kind: 'embed',
        src: `https://player.vimeo.com/video/${id}`,
        title: 'Видео Vimeo',
        provider: 'Vimeo',
        oembed: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`,
      }
    }
  }

  if (host === 'rutube.ru' || host.endsWith('.rutube.ru')) {
    const parts = pathname.split('/').filter(Boolean)
    let id = ''
    if (parts[0] === 'play' && parts[1] === 'embed') id = parts[2] ?? ''
    else {
      const videoIndex = parts.findIndex((part) => part === 'video' || part === 'shorts')
      id = videoIndex >= 0 ? parts[videoIndex + 1] ?? '' : ''
    }
    if (id) {
      return {
        kind: 'embed',
        src: `https://rutube.ru/play/embed/${id}/`,
        title: 'Видео Rutube',
        provider: 'Rutube',
        oembed: `https://rutube.ru/api/oembed/?url=${encodeURIComponent(`https://rutube.ru/video/${id}/`)}&format=json`,
      }
    }
  }

  if (host === 'vk.com' || host === 'vkvideo.ru' || host.endsWith('.vk.com') || host.endsWith('.vkvideo.ru')) {
    if (pathname.includes('video_ext.php')) {
      return { kind: 'embed', src: normalized, title: 'VK Видео', provider: 'VK Видео' }
    }
    const match = `${pathname}${url.search}`.match(/video(-?\d+)_(\d+)/)
    if (match) {
      return {
        kind: 'embed',
        src: `https://vkvideo.ru/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2`,
        title: 'VK Видео',
        provider: 'VK Видео',
      }
    }
  }

  return null
}

function withAutoplay(src: string) {
  const url = new URL(src)
  url.searchParams.set('autoplay', '1')
  return url.toString()
}

function useThumbnail(video: ParsedVideo | null) {
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    if (!video || video.kind !== 'embed') return
    if (video.thumb) {
      setThumb(video.thumb)
      return
    }
    if (!video.oembed) return
    let cancelled = false
    fetch(video.oembed)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { thumbnail_url?: string } | null) => {
        if (!cancelled && data?.thumbnail_url) setThumb(data.thumbnail_url)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [video])

  return thumb
}

export function VideoCard({ url, poster }: { url: string; poster?: string | null }) {
  const video = parseVideoUrl(url)
  const thumb = useThumbnail(video)
  const [open, setOpen] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)

  if (!video) {
    return (
      <a className="video-card video-card-link" href={url} target="_blank" rel="noreferrer">
        <ExternalLink size={22} />
        <span>Открыть видео</span>
      </a>
    )
  }

  const provider = video.kind === 'file' ? 'Видео' : video.provider

  return (
    <>
      <button type="button" className="video-card" onClick={() => setOpen(true)} aria-label={`Смотреть видео (${provider})`}>
        {video.kind === 'file' ? (
          <video className="video-card-media" src={`${video.src}#t=0.5`} preload="metadata" muted playsInline />
        ) : thumb && !thumbFailed ? (
          <img className="video-card-media" src={thumb} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : poster ? (
          <img className="video-card-media video-card-poster" src={poster} alt="" loading="lazy" />
        ) : (
          <span className="video-card-media video-card-blank" />
        )}
        <span className="video-card-shade" />
        <span className="video-card-play"><Play size={26} fill="currentColor" /></span>
        <span className="video-card-label">{provider}</span>
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} wide>
          <div className="video-modal-frame">
            {video.kind === 'file' ? (
              <video controls autoPlay playsInline src={video.src} />
            ) : (
              <iframe
                src={video.noAutoplay ? video.src : withAutoplay(video.src)}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
