import { useEffect, useRef } from 'react'

interface Props {
  /** Stops the animation (Drive Mode, hidden tab) and renders a single static frame. */
  paused?: boolean
  /** Speed in m/s; stretches the wind streaks. */
  speedMs?: number
}

interface Streak {
  x: number
  y: number
  len: number
  v: number
}

/** Perspective dotted grid + wind streaks on a light 2D canvas. */
export function Background({ paused, speedMs = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const speedRef = useRef(speedMs)
  useEffect(() => {
    speedRef.current = speedMs
  }, [speedMs])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const streaks: Streak[] = Array.from({ length: 26 }, (_, i) => ({
      x: ((i * 97) % 1000) / 1000,
      y: ((i * 53) % 100) / 100,
      len: 0.04 + ((i * 31) % 10) / 100,
      v: 0.05 + ((i * 17) % 10) / 100,
    }))
    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()
    let phase = 0

    const resize = () => {
      w = canvas.width = canvas.clientWidth
      h = canvas.height = canvas.clientHeight
    }
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h)
      const horizon = h * 0.52
      const rows = 14
      const cols = 36
      phase = (phase + dt * (0.12 + speedRef.current * 0.02)) % 1
      for (let r = 0; r < rows; r++) {
        const z = (r + phase) / rows // 0 far .. 1 near
        const y = horizon + (h - horizon) * z * z
        const spread = 0.15 + z * 1.9
        ctx.globalAlpha = Math.min(1, z * 1.4) * 0.55
        ctx.fillStyle = '#ff2a2a'
        const size = 1 + z * 2.2
        for (let c = -cols / 2; c <= cols / 2; c++) {
          const x = w / 2 + c * (w / cols) * spread
          if (x < 0 || x > w) continue
          ctx.fillRect(x, y, size, size)
        }
      }
      ctx.globalAlpha = 0.22
      ctx.strokeStyle = '#ff6a6a'
      ctx.lineWidth = 1
      const stretch = 1 + Math.min(speedRef.current, 40) * 0.05
      for (const s of streaks) {
        s.x -= s.v * dt * (0.5 + speedRef.current * 0.03)
        if (s.x < -0.2) s.x = 1.1
        ctx.beginPath()
        ctx.moveTo(s.x * w, s.y * h * 0.6)
        ctx.lineTo((s.x + s.len * stretch) * w, s.y * h * 0.6)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      draw(dt)
      raf = requestAnimationFrame(frame)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (paused || reduce) draw(0)
    })
    ro.observe(canvas)
    if (paused || reduce) draw(0)
    else raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [paused])

  return (
    <canvas
      ref={ref}
      className="ev-bg"
      aria-hidden="true"
      data-paused={paused ? 'true' : 'false'}
    />
  )
}
