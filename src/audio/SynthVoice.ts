import { distortionCurve, firingFreq } from './mix'
import type { EngineFrame, SoundProfile, Voice } from './types'

const TAU = 0.08

function noiseBuffer(ctx: BaseAudioContext, seconds = 2) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/** 100 % synthesized engine: harmonic oscillators at the firing frequency + filtered noise. */
export class SynthVoice implements Voice {
  private oscs: { osc: OscillatorNode; gain: GainNode; harmonic: number; base: number }[] = []
  private noise: AudioBufferSourceNode
  private noiseFilter: BiquadFilterNode
  private noiseGain: GainNode
  private shaper: WaveShaperNode
  private lowpass: BiquadFilterNode
  private out: GainNode
  private noiseBuf: AudioBuffer

  private ctx: AudioContext
  private profile: SoundProfile

  constructor(ctx: AudioContext, profile: SoundProfile) {
    this.ctx = ctx
    this.profile = profile
    const synth = profile.synth ?? {
      oscillators: [{ type: 'sawtooth', harmonic: 1, gain: 0.5 }],
      noise: 0.1,
    }
    this.out = ctx.createGain()
    this.out.gain.value = 0
    this.lowpass = ctx.createBiquadFilter()
    this.lowpass.type = 'lowpass'
    this.lowpass.frequency.value = profile.fx.lowpassBaseHz
    this.shaper = ctx.createWaveShaper()
    this.shaper.curve = distortionCurve(profile.fx.distortion)
    this.shaper.oversample = '2x'
    const sum = ctx.createGain()
    sum.gain.value = 1 / Math.max(1, synth.oscillators.length * 0.6)

    for (const o of synth.oscillators) {
      const osc = ctx.createOscillator()
      osc.type = o.type
      osc.detune.value = o.detuneCents ?? 0
      osc.frequency.value = 40
      const gain = ctx.createGain()
      gain.gain.value = o.gain
      osc.connect(gain).connect(sum)
      osc.start()
      this.oscs.push({ osc, gain, harmonic: o.harmonic, base: o.gain })
    }

    this.noiseBuf = noiseBuffer(ctx)
    this.noise = ctx.createBufferSource()
    this.noise.buffer = this.noiseBuf
    this.noise.loop = true
    this.noiseFilter = ctx.createBiquadFilter()
    this.noiseFilter.type = 'bandpass'
    this.noiseFilter.Q.value = 0.8
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0
    this.noise.connect(this.noiseFilter).connect(this.noiseGain).connect(sum)
    this.noise.start()

    sum.connect(this.shaper).connect(this.lowpass).connect(this.out)
  }

  connect(dest: AudioNode) {
    this.out.connect(dest)
  }

  setFrame(f: EngineFrame) {
    const t = this.ctx.currentTime
    const fire = firingFreq(f.rpm, this.profile.cylinders) * f.pitchMul
    for (const o of this.oscs) {
      o.osc.frequency.setTargetAtTime(Math.min(fire * o.harmonic, 8000), t, TAU)
      // upper harmonics bloom under load
      const bloom = o.harmonic <= 2 ? 1 : 0.4 + 0.6 * f.load
      o.gain.gain.setTargetAtTime(o.base * bloom, t, TAU)
    }
    const noise = this.profile.synth?.noise ?? 0
    this.noiseGain.gain.setTargetAtTime(noise * (0.4 + 0.6 * f.load), t, TAU)
    this.noiseFilter.frequency.setTargetAtTime(Math.min(Math.max(fire * 3, 200), 6000), t, TAU)
    this.lowpass.frequency.setTargetAtTime(f.lowpassHz, t, TAU)
    this.out.gain.setTargetAtTime(f.level * 0.8, t, TAU)
    if (f.pop) this.pop()
  }

  private pop() {
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'bandpass'
    hp.frequency.value = 900
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    src.connect(hp).connect(g).connect(this.out)
    src.start(t)
    src.stop(t + 0.1)
  }

  stop() {
    const t = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(t)
    this.out.gain.setTargetAtTime(0, t, 0.05)
    const end = t + 0.4
    this.oscs.forEach((o) => o.osc.stop(end))
    this.noise.stop(end)
    setTimeout(() => this.out.disconnect(), 500)
  }
}
