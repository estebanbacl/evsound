import type { AudioEngine } from './AudioEngine'

export interface AmbientCallbacks {
  onError: (message: string) => void
}

const FADE_IN_S = 1.6
const FADE_OUT_S = 1.0

/**
 * Seamless-loop playback of one relaxation sound through an HTMLMediaElement (so the OS media
 * controls see it), routed into the shared graph: element → fade → duck → volume → ambient bus.
 * Volume is independent from the simulated engine's.
 */
export class AmbientPlayer {
  private el: HTMLAudioElement
  private fade: GainNode | null = null
  private duckGain: GainNode | null = null
  private vol: GainNode | null = null
  private wired = false
  private engine: AudioEngine
  private cb: AmbientCallbacks
  private duck = 1
  private volume = 0.5
  private pauseTimer: ReturnType<typeof setTimeout> | null = null
  private swapTimer: ReturnType<typeof setTimeout> | null = null

  constructor(engine: AudioEngine, cb: AmbientCallbacks, el: HTMLAudioElement = new Audio()) {
    this.engine = engine
    this.cb = cb
    this.el = el
    this.el.preload = 'auto'
    this.el.loop = true
    this.el.addEventListener('error', () => cb.onError('No se pudo reproducir el sonido'))
  }

  private clearTimers() {
    if (this.pauseTimer) clearTimeout(this.pauseTimer)
    if (this.swapTimer) clearTimeout(this.swapTimer)
    this.pauseTimer = this.swapTimer = null
  }

  private ramp(to: number, seconds: number) {
    const ctx = this.engine.context
    if (!this.fade || !ctx) return
    const g = this.fade.gain
    g.cancelScheduledValues(ctx.currentTime)
    g.setValueAtTime(g.value, ctx.currentTime)
    g.linearRampToValueAtTime(to, ctx.currentTime + seconds)
  }

  /** Cross-fades to another source: fade out, swap src, fade in (if it was playing). */
  load(url: string) {
    if (this.el.getAttribute('src') === url) return
    const wasPlaying = !this.el.paused
    const swap = () => {
      this.el.src = url
      this.el.load()
      if (wasPlaying) void this.play()
    }
    this.clearTimers()
    if (wasPlaying && this.fade) {
      this.ramp(0, 0.5)
      this.swapTimer = setTimeout(swap, 550)
    } else {
      swap()
    }
  }

  /** Route through the shared graph the first time (needs an unlocked context). */
  private wire() {
    const ctx = this.engine.context
    const dest = this.engine.ambientInput
    if (this.wired || !ctx || !dest) return
    const src = ctx.createMediaElementSource(this.el)
    this.fade = ctx.createGain()
    this.duckGain = ctx.createGain()
    this.vol = ctx.createGain()
    this.fade.gain.value = 0
    this.duckGain.gain.value = this.duck
    this.vol.gain.value = this.volume
    src.connect(this.fade).connect(this.duckGain).connect(this.vol).connect(dest)
    this.wired = true
  }

  async play() {
    this.clearTimers()
    try {
      await this.engine.unlock()
    } catch {
      /* no gesture: fall back to the element's own output */
    }
    this.wire()
    try {
      await this.el.play()
      this.ramp(1, FADE_IN_S)
    } catch (e) {
      this.cb.onError(`Reproducción bloqueada: ${String(e)}`)
    }
  }

  /** Fades out, then pauses (keeps the position). */
  pause() {
    this.finish(false)
  }

  /** Fades out, then pauses and rewinds. */
  stop() {
    this.finish(true)
  }

  private finish(rewind: boolean) {
    this.clearTimers()
    const done = () => {
      this.el.pause()
      if (rewind) this.el.currentTime = 0
    }
    if (this.fade && !this.el.paused) {
      this.ramp(0, FADE_OUT_S)
      this.pauseTimer = setTimeout(done, FADE_OUT_S * 1000 + 50)
    } else {
      done()
    }
  }

  /** 0..1, independent from the engine volume. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    const ctx = this.engine.context
    if (this.vol && ctx) this.vol.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.05)
    else this.el.volume = this.volume
  }

  /** Ducking factor 0..1 (used when mixing with the simulated engine). */
  setDuck(factor: number) {
    this.duck = factor
    const ctx = this.engine.context
    if (this.duckGain && ctx) this.duckGain.gain.setTargetAtTime(factor, ctx.currentTime, 0.2)
  }

  get paused() {
    return this.el.paused
  }
}
