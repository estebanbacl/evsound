import { useEffect, useRef } from 'react'
import { audioEngine } from '../../audio/AudioEngine'

/** Live oscilloscope of the engine output (AnalyserNode). Stops drawing when unmounted. */
export function Waveform({ height = 90 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let buf: Uint8Array<ArrayBuffer> | null = null
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const a = audioEngine.analyser
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#ff2a2a'
      ctx.shadowColor = '#ff2a2a'
      ctx.shadowBlur = 6
      ctx.lineWidth = 2
      ctx.beginPath()
      if (!a) {
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
      } else {
        buf ??= new Uint8Array(a.fftSize)
        a.getByteTimeDomainData(buf)
        const step = Math.max(1, Math.floor(buf.length / w))
        for (let x = 0; x < w; x++) {
          const v = buf[Math.min(buf.length - 1, x * step)] / 128 - 1
          const y = h / 2 + v * (h / 2) * 0.9
          if (x) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        }
      }
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <canvas ref={ref} className="waveform" width={560} height={height} aria-label="Forma de onda" />
  )
}
