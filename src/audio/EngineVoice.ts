import { layerMix } from './mix'
import type { EngineFrame, SoundProfile, Voice } from './types'

const TAU = 0.08

interface Track {
  src: AudioBufferSourceNode
  gain: GainNode
}
interface Layer {
  rpm: number
  on: Track
  off?: Track
}

export interface SoundManifest {
  layers: { rpm: number; onLoad: string; offLoad?: string }[]
}

export async function loadManifest(
  profileId: string,
  fetcher: typeof fetch = fetch,
): Promise<SoundManifest | null> {
  try {
    const res = await fetcher(`${import.meta.env.BASE_URL}sounds/${profileId}/manifest.json`)
    if (!res.ok) return null
    const json = (await res.json()) as SoundManifest
    return json.layers?.length ? json : null
  } catch {
    return null
  }
}

/** Sampled engine: looped layers at fixed rpm, equal-power crossfade, on/off-load blend. */
export class EngineVoice implements Voice {
  private layers: Layer[] = []
  private lowpass: BiquadFilterNode
  private out: GainNode

  private ctx: AudioContext

  private constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 0
    this.lowpass = ctx.createBiquadFilter()
    this.lowpass.type = 'lowpass'
    this.lowpass.connect(this.out)
  }

  static async create(
    ctx: AudioContext,
    profile: SoundProfile,
    manifest: SoundManifest,
    fetcher: typeof fetch = fetch,
  ): Promise<EngineVoice> {
    const voice = new EngineVoice(ctx)
    const base = `${import.meta.env.BASE_URL}sounds/${profile.id}/`
    const load = async (file: string) => {
      const res = await fetcher(base + file)
      return ctx.decodeAudioData(await res.arrayBuffer())
    }
    const track = (buf: AudioBuffer): Track => {
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(gain).connect(voice.lowpass)
      src.start()
      return { src, gain }
    }
    const sorted = [...manifest.layers].sort((a, b) => a.rpm - b.rpm)
    for (const l of sorted) {
      const on = track(await load(l.onLoad))
      const off = l.offLoad ? track(await load(l.offLoad)) : undefined
      voice.layers.push({ rpm: l.rpm, on, off })
    }
    return voice
  }

  connect(dest: AudioNode) {
    this.out.connect(dest)
  }

  setFrame(f: EngineFrame) {
    const t = this.ctx.currentTime
    const mix = layerMix(
      f.rpm * f.pitchMul,
      this.layers.map((l) => l.rpm),
    )
    for (const m of mix) {
      const l = this.layers[m.index]
      const onShare = l.off ? f.load : 1
      l.on.src.playbackRate.setTargetAtTime(m.rate, t, TAU)
      l.on.gain.gain.setTargetAtTime(m.gain * onShare, t, TAU)
      if (l.off) {
        l.off.src.playbackRate.setTargetAtTime(m.rate, t, TAU)
        l.off.gain.gain.setTargetAtTime(m.gain * (1 - f.load), t, TAU)
      }
    }
    this.lowpass.frequency.setTargetAtTime(f.lowpassHz, t, TAU)
    this.out.gain.setTargetAtTime(f.level, t, TAU)
  }

  stop() {
    const t = this.ctx.currentTime
    this.out.gain.setTargetAtTime(0, t, 0.05)
    for (const l of this.layers) {
      l.on.src.stop(t + 0.4)
      l.off?.src.stop(t + 0.4)
    }
    setTimeout(() => this.out.disconnect(), 500)
  }
}

export type { Layer }
