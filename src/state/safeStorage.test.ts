import { safeStorage } from './safeStorage'

describe('safeStorage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads and writes when localStorage works', () => {
    safeStorage.setItem('k', 'v')
    expect(safeStorage.getItem('k')).toBe('v')
    safeStorage.removeItem('k')
    expect(safeStorage.getItem('k')).toBeNull()
  })

  it('never throws when localStorage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => safeStorage.setItem('k', 'v')).not.toThrow()
    expect(safeStorage.getItem('k')).toBeNull()
    expect(() => safeStorage.removeItem('k')).not.toThrow()
  })
})
