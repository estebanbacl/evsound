import { AudioEngine } from './AudioEngine'

class FakeParam {
  value = 0
  setTargetAtTime = vi.fn()
}
class FakeNode {
  gain = new FakeParam()
  threshold = new FakeParam()
  knee = new FakeParam()
  ratio = new FakeParam()
  attack = new FakeParam()
  release = new FakeParam()
  fftSize = 0
  connect = vi.fn((n: unknown) => n)
}
class FakeCtx extends EventTarget {
  state = 'suspended'
  currentTime = 0
  destination = new FakeNode()
  gesture = false
  createGain = () => new FakeNode()
  createDynamicsCompressor = () => new FakeNode()
  createAnalyser = () => new FakeNode()
  resume = vi.fn(async () => {
    if (!this.gesture) throw new Error('NotAllowedError')
    this.set('running')
  })
  set(s: string) {
    this.state = s
    this.dispatchEvent(new Event('statechange'))
  }
}

const mk = () => {
  const ctx = new FakeCtx()
  const engine = new AudioEngine(() => ctx as unknown as AudioContext, undefined)
  return { ctx, engine }
}
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('AudioEngine', () => {
  it('does not create a context until unlock()', () => {
    const { engine } = mk()
    expect(engine.context).toBeNull()
    expect(engine.state).toBe('uninitialized')
  })

  it('unlock creates the graph and resumes', async () => {
    const { ctx, engine } = mk()
    ctx.gesture = true
    await engine.unlock()
    expect(engine.state).toBe('running')
    expect(engine.input).not.toBeNull()
    expect(engine.analyser).not.toBeNull()
  })

  it('caps output gain by maxVolume', async () => {
    const { ctx, engine } = mk()
    ctx.gesture = true
    await engine.unlock()
    engine.setMaxVolume(0.5)
    engine.setVolume(1)
    // master is the second gain node created
    const calls = (engine as unknown as { master: FakeNode }).master.gain.setTargetAtTime.mock.calls
    expect(calls.at(-1)![0]).toBeCloseTo(0.5)
    engine.setVolume(5)
    expect(engine.volume).toBe(1)
  })

  it('emits needsGesture when suspended and resume is refused, then recovers on unlock', async () => {
    const { ctx, engine } = mk()
    ctx.gesture = true
    await engine.unlock()
    const cb = vi.fn()
    engine.on('needsGesture', cb)
    ctx.gesture = false
    ctx.set('suspended')
    await tick()
    expect(cb).toHaveBeenCalledOnce()
    expect(engine.needsGesture).toBe(true)
    ctx.gesture = true
    await engine.unlock()
    expect(engine.needsGesture).toBe(false)
  })

  it('auto-resumes without a gesture when the browser allows it', async () => {
    const { ctx, engine } = mk()
    ctx.gesture = true
    await engine.unlock()
    ctx.set('suspended')
    await tick()
    expect(engine.state).toBe('running')
    expect(engine.needsGesture).toBe(false)
  })

  it('resumes on visibilitychange', async () => {
    const ctx = new FakeCtx()
    ctx.gesture = true
    const doc = new EventTarget() as unknown as Document
    Object.assign(doc, { visibilityState: 'visible' })
    const engine = new AudioEngine(() => ctx as unknown as AudioContext, doc)
    await engine.unlock()
    ctx.state = 'suspended'
    doc.dispatchEvent(new Event('visibilitychange'))
    await tick()
    expect(engine.state).toBe('running')
  })
})
