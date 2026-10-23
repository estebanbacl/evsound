import { currentItem, usePlayerStore } from './playerStore'
import type { AmbientCollection } from '../audio/ambientCatalog'

const col: AmbientCollection = {
  id: 'c1',
  title: 'Col',
  artist: 'Me',
  genre: 'g',
  year: 2026,
  cover: { style: 'orbit', hue: 1, seed: 1 },
  tracks: ['a', 'b', 'c'].map((n, i) => ({
    id: `t${i}`,
    title: n,
    file: `${n}.wav`,
    durationS: 30,
  })),
}
const other: AmbientCollection = { ...col, id: 'c2', title: 'Other' }

const reset = () =>
  usePlayerStore.setState({
    queue: [],
    order: [],
    pos: 0,
    playing: false,
    shuffle: false,
    repeat: false,
    positionS: 0,
    durationS: 0,
    recent: [],
    lastTrackId: null,
    lastCollectionId: null,
  })

describe('playerStore', () => {
  beforeEach(reset)

  it('plays a collection from a chosen track and records last/recent', () => {
    usePlayerStore.getState().playCollection(col, 't1')
    const s = usePlayerStore.getState()
    expect(currentItem(s)?.track.id).toBe('t1')
    expect(s.playing).toBe(true)
    expect(s.lastCollectionId).toBe('c1')
    expect(s.durationS).toBe(30)
    usePlayerStore.getState().playCollection(other)
    usePlayerStore.getState().playCollection(col)
    expect(usePlayerStore.getState().recent).toEqual(['c1', 'c2'])
  })

  it('next/prev walk the queue and stop at the end without repeat', () => {
    const p = usePlayerStore.getState()
    p.playCollection(col)
    p.next()
    p.next()
    expect(currentItem(usePlayerStore.getState())?.track.id).toBe('t2')
    usePlayerStore.getState().ended()
    expect(usePlayerStore.getState().playing).toBe(false)
    usePlayerStore.getState().prev()
    expect(currentItem(usePlayerStore.getState())?.track.id).toBe('t1')
  })

  it('repeat loops the collection', () => {
    const p = usePlayerStore.getState()
    p.playCollection(col, 't2')
    p.toggleRepeat()
    usePlayerStore.getState().ended()
    expect(currentItem(usePlayerStore.getState())?.track.id).toBe('t0')
    expect(usePlayerStore.getState().playing).toBe(true)
  })

  it('prev past 3 s restarts the current track instead', () => {
    const p = usePlayerStore.getState()
    p.playCollection(col, 't1')
    usePlayerStore.getState().setProgress(10, 30)
    usePlayerStore.getState().prev()
    const s = usePlayerStore.getState()
    expect(currentItem(s)?.track.id).toBe('t1')
    expect(s.positionS).toBe(0)
  })

  it('shuffle keeps the current track and reorders the rest', () => {
    const p = usePlayerStore.getState()
    p.playCollection(col, 't1')
    p.toggleShuffle()
    const s = usePlayerStore.getState()
    expect(s.shuffle).toBe(true)
    expect(currentItem(s)?.track.id).toBe('t1')
    expect([...s.order].sort()).toEqual([0, 1, 2])
  })

  it('toggle does nothing on an empty queue', () => {
    usePlayerStore.getState().toggle()
    expect(usePlayerStore.getState().playing).toBe(false)
  })
})
