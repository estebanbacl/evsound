import type { SoundProfile } from '../types'

export const v8Americano: SoundProfile = {
  id: 'v8-americano',
  name: 'V8 Americano',
  kind: 'synth', // switches to 'sampled' once licensed loops exist in public/sounds/v8-americano
  gears: [3.2, 2.1, 1.5, 1.15, 0.9, 0.75],
  idleRpm: 750,
  redlineRpm: 6200,
  shiftUpRpm: 5200,
  shiftDownRpm: 2200,
  cylinders: 8,
  synth: {
    oscillators: [
      { type: 'sawtooth', harmonic: 1, gain: 0.55 },
      { type: 'square', harmonic: 0.5, gain: 0.35 },
      { type: 'sawtooth', harmonic: 2, gain: 0.25, detuneCents: 6 },
      { type: 'triangle', harmonic: 3, gain: 0.15 },
    ],
    noise: 0.12,
  },
  fx: { lowpassBaseHz: 700, lowpassLoadHz: 3200, distortion: 0.35 },
}

export const turbo4: SoundProfile = {
  id: 'turbo-4',
  name: 'Turbo 4 cilindros',
  kind: 'synth',
  gears: [3.6, 2.2, 1.55, 1.2, 0.95, 0.78],
  idleRpm: 850,
  redlineRpm: 7000,
  shiftUpRpm: 6000,
  shiftDownRpm: 2500,
  cylinders: 4,
  synth: {
    oscillators: [
      { type: 'sawtooth', harmonic: 1, gain: 0.5 },
      { type: 'sawtooth', harmonic: 2, gain: 0.3, detuneCents: -8 },
      { type: 'sine', harmonic: 6, gain: 0.12 }, // turbo whistle
    ],
    noise: 0.2,
  },
  fx: { lowpassBaseHz: 1000, lowpassLoadHz: 4500, distortion: 0.2 },
}

export const naveEspacial: SoundProfile = {
  id: 'nave-espacial',
  name: 'Nave Espacial',
  kind: 'synth',
  gears: [1],
  idleRpm: 600,
  redlineRpm: 9000,
  shiftUpRpm: 8500,
  shiftDownRpm: 1000,
  cylinders: 6,
  synth: {
    oscillators: [
      { type: 'sine', harmonic: 1, gain: 0.5 },
      { type: 'sawtooth', harmonic: 2.01, gain: 0.25, detuneCents: 12 },
      { type: 'sine', harmonic: 4, gain: 0.2, detuneCents: -15 },
    ],
    noise: 0.06,
  },
  fx: { lowpassBaseHz: 1800, lowpassLoadHz: 7000, distortion: 0 },
}

export const turbina: SoundProfile = {
  id: 'turbina',
  name: 'Turbina',
  kind: 'synth',
  gears: [2.4, 1.4, 1],
  idleRpm: 1200,
  redlineRpm: 9500,
  shiftUpRpm: 8000,
  shiftDownRpm: 3500,
  cylinders: 14,
  synth: {
    oscillators: [
      { type: 'triangle', harmonic: 1, gain: 0.4 },
      { type: 'sine', harmonic: 2, gain: 0.3 },
      { type: 'sawtooth', harmonic: 3, gain: 0.1 },
    ],
    noise: 0.35,
  },
  fx: { lowpassBaseHz: 2200, lowpassLoadHz: 6500, distortion: 0.05 },
}

export const soundProfiles: SoundProfile[] = [v8Americano, turbo4, naveEspacial, turbina]
export const getProfile = (id: string) => soundProfiles.find((p) => p.id === id) ?? soundProfiles[0]
