import { readFileSync } from 'node:fs'

interface Rule {
  source: string
  headers: { key: string; value: string }[]
}
const rules = (JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Rule[] }).headers
const cc = (source: string) =>
  rules.find((r) => r.source === source)?.headers.find((h) => h.key === 'Cache-Control')?.value

describe('vercel.json cache headers', () => {
  it('never caches the service worker', () => expect(cc('/sw.js')).toMatch(/no-cache/))
  it('never caches the HTML shell and manifest', () =>
    expect(cc('/(index.html|manifest.webmanifest|offline.html|registerSW.js)')).toBe('no-cache'))
  it('caches hashed assets forever', () =>
    expect(cc('/assets/(.*)')).toMatch(/max-age=31536000.*immutable/))
  it('caches sounds and models for a week (not hashed, so not immutable)', () => {
    for (const s of ['/sounds/(.*)', '/models/(.*)']) {
      expect(cc(s)).toMatch(/max-age=604800/)
      expect(cc(s)).not.toMatch(/immutable/)
    }
  })
  it('restricts powerful features to what the app uses', () => {
    const all = rules.find((r) => r.source === '/(.*)')!.headers
    expect(all.find((h) => h.key === 'Permissions-Policy')?.value).toContain('geolocation=(self)')
    expect(all.find((h) => h.key === 'Permissions-Policy')?.value).toContain('microphone=()')
  })
})
