import { remainingMs, usePlayerStore } from './playerStore'

const reset = () =>
  usePlayerStore.setState({
    soundId: null,
    playing: false,
    volume: 0.5,
    timerMin: 0,
    endsAt: null,
    favorites: [],
    recent: [],
  })

describe('playerStore', () => {
  beforeEach(() => {
    reset()
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => vi.useRealTimers())

  it('does not start on its own and ignores toggle without a sound', () => {
    expect(usePlayerStore.getState().playing).toBe(false)
    usePlayerStore.getState().toggle()
    usePlayerStore.getState().setPlaying(true)
    expect(usePlayerStore.getState().playing).toBe(false)
  })

  it('plays a sound, tracks recents (most recent first, no duplicates, capped)', () => {
    const s = usePlayerStore.getState()
    for (let i = 0; i < 10; i++) s.play(`c/s${i}`)
    s.play('c/s5')
    const { recent, soundId, playing } = usePlayerStore.getState()
    expect(soundId).toBe('c/s5')
    expect(playing).toBe(true)
    expect(recent[0]).toBe('c/s5')
    expect(recent.filter((r) => r === 'c/s5')).toHaveLength(1)
    expect(recent).toHaveLength(8)
  })

  it('pause keeps the sound, stop clears the timer', () => {
    const s = usePlayerStore.getState()
    s.setTimer(15)
    s.play('a/b')
    expect(usePlayerStore.getState().endsAt).toBe(1_000_000 + 15 * 60_000)
    usePlayerStore.getState().toggle()
    expect(usePlayerStore.getState()).toMatchObject({
      playing: false,
      endsAt: null,
      soundId: 'a/b',
    })
    usePlayerStore.getState().toggle()
    expect(usePlayerStore.getState().endsAt).toBe(1_000_000 + 15 * 60_000)
    usePlayerStore.getState().stop()
    expect(usePlayerStore.getState()).toMatchObject({
      playing: false,
      endsAt: null,
      soundId: 'a/b',
    })
  })

  it('timer: unlimited has no end; changing it while playing restarts the countdown', () => {
    const s = usePlayerStore.getState()
    s.play('a/b')
    expect(usePlayerStore.getState().endsAt).toBeNull()
    s.setTimer(30)
    expect(usePlayerStore.getState().endsAt).toBe(1_000_000 + 30 * 60_000)
    s.setTimer(0)
    expect(usePlayerStore.getState().endsAt).toBeNull()
    expect(remainingMs(1_000_500)).toBe(500)
    expect(remainingMs(null)).toBeNull()
    expect(remainingMs(10)).toBe(0)
  })

  it('volume is clamped; favourites toggle', () => {
    const s = usePlayerStore.getState()
    s.setVolume(3)
    expect(usePlayerStore.getState().volume).toBe(1)
    s.setVolume(-1)
    expect(usePlayerStore.getState().volume).toBe(0)
    s.toggleFavorite('a/b')
    s.toggleFavorite('c/d')
    expect(usePlayerStore.getState().favorites).toEqual(['c/d', 'a/b'])
    s.toggleFavorite('c/d')
    expect(usePlayerStore.getState().favorites).toEqual(['a/b'])
  })
})
