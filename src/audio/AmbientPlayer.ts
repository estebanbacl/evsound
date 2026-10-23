import type { AudioEngine } from './AudioEngine'

export interface AmbientCallbacks {
  onTime: (positionS: number, durationS: number) => void
  onEnded: () => void
  onError: (message: string) => void
}

/**
 * Ambient track playback through an HTMLMediaElement (needed so the OS media controls and
 * Media Session see it), routed into the shared audio graph for volume, limiter and ducking.
 */
export class AmbientPlayer {
  private el: HTMLAudioElement
  private gain: GainNode | null = null
  private wired = false
  private engine: AudioEngine
  private cb: AmbientCallbacks
  private duck = 1

  constructor(engine: AudioEngine, cb: AmbientCallbacks, el: HTMLAudioElement = new Audio()) {
    this.engine = engine
    this.cb = cb
    this.el = el
    this.el.preload = 'auto'
    this.el.addEventListener('timeupdate', () =>
      cb.onTime(this.el.currentTime, this.el.duration || 0),
    )
    this.el.addEventListener('ended', () => cb.onEnded())
    this.el.addEventListener('error', () => cb.onError('No se pudo reproducir la pista'))
  }

  load(url: string) {
    if (this.el.getAttribute('src') !== url) {
      this.el.src = url
      this.el.load()
    }
  }

  /** Route the element through the shared graph the first time (needs an unlocked context). */
  private wire() {
    const ctx = this.engine.context
    const dest = this.engine.input
    if (this.wired || !ctx || !dest) return
    const src = ctx.createMediaElementSource(this.el)
    this.gain = ctx.createGain()
    this.gain.gain.value = this.duck
    src.connect(this.gain).connect(dest)
    this.wired = true
  }

  async play() {
    try {
      await this.engine.unlock()
    } catch {
      /* no gesture: fall back to the element's own output */
    }
    this.wire()
    try {
      await this.el.play()
    } catch (e) {
      this.cb.onError(`Reproducción bloqueada: ${String(e)}`)
    }
  }

  pause() {
    this.el.pause()
  }

  seek(s: number) {
    if (Number.isFinite(s)) this.el.currentTime = Math.max(0, s)
  }

  /** Ducking factor 0..1 applied on top of the master volume. */
  setDuck(factor: number) {
    this.duck = factor
    const ctx = this.engine.context
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(factor, ctx.currentTime, 0.15)
  }

  get paused() {
    return this.el.paused
  }
}
