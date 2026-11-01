export type AudioEngineEvent = 'needsGesture' | 'statechange'

type Factory = () => AudioContext
type Listener = () => void

/**
 * App-wide audio graph owner. The AudioContext is only created inside `unlock()`, which must
 * be called from a user gesture. Chain: bus → master → limiter → analyser → destination.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private bus: GainNode | null = null
  private master: GainNode | null = null
  private ambientBus: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private _analyser: AnalyserNode | null = null
  private listeners = new Map<AudioEngineEvent, Set<Listener>>()
  private _volume = 0.7
  private _maxVolume = 0.6
  private _needsGesture = false
  private factory: Factory

  constructor(factory?: Factory, doc: Document | undefined = globalThis.document) {
    this.factory = factory ?? (() => new AudioContext({ latencyHint: 'interactive' }))
    doc?.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'visible') void this.tryResume()
    })
  }

  get context() {
    return this.ctx
  }
  get state(): string {
    return this.ctx?.state ?? 'uninitialized'
  }
  get needsGesture() {
    return this._needsGesture
  }
  get volume() {
    return this._volume
  }
  get maxVolume() {
    return this._maxVolume
  }
  get input(): AudioNode | null {
    return this.bus
  }
  /** Ambient/relaxation sounds enter here: own volume, still protected by the limiter. */
  get ambientInput(): AudioNode | null {
    return this.ambientBus
  }
  get analyser(): AnalyserNode | null {
    return this._analyser
  }

  on(event: AudioEngineEvent, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(cb)
    return () => this.listeners.get(event)?.delete(cb)
  }

  /** Create (once) and resume the context. Call from a click/touch handler. */
  async unlock(): Promise<AudioContext> {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    await ctx.resume()
    this.setNeedsGesture(false)
    return ctx
  }

  /** User volume 0..1; output gain is volume × maxVolume (safety cap). */
  setVolume(v: number) {
    this._volume = Math.min(1, Math.max(0, v))
    this.applyVolume()
  }

  setMaxVolume(v: number) {
    this._maxVolume = Math.min(1, Math.max(0, v))
    this.applyVolume()
  }

  private applyVolume() {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this._volume * this._maxVolume, this.ctx.currentTime, 0.03)
    }
  }

  private build() {
    const ctx = this.factory()
    this.ctx = ctx
    this.bus = ctx.createGain()
    this.master = ctx.createGain()
    this.master.gain.value = this._volume * this._maxVolume
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -6
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.1
    this._analyser = ctx.createAnalyser()
    this._analyser.fftSize = 1024
    this.ambientBus = ctx.createGain()
    this.bus.connect(this.master)
    this.master.connect(this.limiter)
    this.ambientBus.connect(this.limiter)
    this.limiter.connect(this._analyser)
    this._analyser.connect(ctx.destination)
    ctx.addEventListener('statechange', () => {
      this.emit('statechange')
      if (ctx.state !== 'running') void this.tryResume()
    })
  }

  private async tryResume() {
    if (!this.ctx || this.ctx.state === 'running' || this.ctx.state === 'closed') return
    try {
      await this.ctx.resume()
      this.setNeedsGesture((this.ctx.state as string) !== 'running')
    } catch {
      this.setNeedsGesture(true)
    }
  }

  private setNeedsGesture(v: boolean) {
    const changed = v !== this._needsGesture
    this._needsGesture = v
    if (changed && v) this.emit('needsGesture')
  }

  private emit(e: AudioEngineEvent) {
    this.listeners.get(e)?.forEach((cb) => cb())
  }
}

export const audioEngine = new AudioEngine()
