import { haversine } from './haversine'

describe('haversine', () => {
  it('is zero for identical points', () => expect(haversine(4.7, -74, 4.7, -74)).toBe(0))
  it('~111.2 km per degree of latitude', () =>
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111_195, -2))
  it('is symmetric', () =>
    expect(haversine(4.6, -74.1, 6.2, -75.5)).toBeCloseTo(haversine(6.2, -75.5, 4.6, -74.1), 6))
})
