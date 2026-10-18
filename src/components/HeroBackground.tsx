import { useEffect, useRef } from 'react'

type Point = { x: number; y: number; vx: number; vy: number }

export function HeroBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: -9999, y: -9999 }
    const link = 140
    let width = 0
    let height = 0
    let points: Point[] = []
    let frame = 0
    let visible = true

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.round(Math.min(90, Math.max(26, (width * height) / 16000)))
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      }))
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      if (!reduce) {
        for (const point of points) {
          point.x += point.vx
          point.y += point.vy
          if (point.x < 0 || point.x > width) point.vx *= -1
          if (point.y < 0 || point.y > height) point.vy *= -1
        }
      }
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i]
        for (let j = i + 1; j < points.length; j += 1) {
          const b = points[j]
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance < link) {
            context.strokeStyle = `rgba(94,234,212,${(1 - distance / link) * 0.28})`
            context.lineWidth = 1
            context.beginPath()
            context.moveTo(a.x, a.y)
            context.lineTo(b.x, b.y)
            context.stroke()
          }
        }
        const toMouse = Math.hypot(a.x - mouse.x, a.y - mouse.y)
        if (toMouse < 190) {
          context.strokeStyle = `rgba(94,234,212,${(1 - toMouse / 190) * 0.7})`
          context.beginPath()
          context.moveTo(a.x, a.y)
          context.lineTo(mouse.x, mouse.y)
          context.stroke()
        }
        context.fillStyle = 'rgba(94,234,212,.75)'
        context.beginPath()
        context.arc(a.x, a.y, 1.7, 0, Math.PI * 2)
        context.fill()
      }
      if (!reduce && visible) frame = requestAnimationFrame(draw)
    }

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    resize()
    draw()
    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reduce) draw()
    })
    resizeObserver.observe(canvas)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduce) {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(draw)
      }
    })
    visibility.observe(canvas)
    window.addEventListener('pointermove', onMove)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      visibility.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />
}
