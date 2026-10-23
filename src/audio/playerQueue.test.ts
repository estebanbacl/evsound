import { makeOrder, nextPos, prevPos } from './playerQueue'

const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32

describe('playerQueue', () => {
  it('keeps natural order without shuffle', () => {
    expect(makeOrder(4, 0, false)).toEqual([0, 1, 2, 3])
  })

  it('shuffle keeps every track once and starts with the current one', () => {
    const o = makeOrder(8, 3, true, seeded(5))
    expect(o[0]).toBe(3)
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(o).not.toEqual([3, 0, 1, 2, 4, 5, 6, 7])
  })

  it('handles empty queues', () => {
    expect(makeOrder(0, 0, true)).toEqual([])
  })

  it('next stops at the end unless repeat is on', () => {
    expect(nextPos(1, 3, false)).toBe(2)
    expect(nextPos(2, 3, false)).toBeNull()
    expect(nextPos(2, 3, true)).toBe(0)
    expect(nextPos(0, 0, true)).toBeNull()
  })

  it('prev wraps only with repeat', () => {
    expect(prevPos(2, 3, false)).toBe(1)
    expect(prevPos(0, 3, false)).toBe(0)
    expect(prevPos(0, 3, true)).toBe(2)
  })
})
