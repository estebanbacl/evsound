import { readFileSync } from 'node:fs'

const css = readFileSync('src/ui/tokens.css', 'utf8')
const token = (name: string) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!m) throw new Error(`token --${name} not found`)
  return m[1]
}

const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
/** Colour of a translucent overlay (hex at alpha) over a background. */
const over = (fg: string, alpha: number, bg: string) => {
  const mix = (i: number) =>
    Math.round(
      parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha),
    )
  return `#${[1, 3, 5].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`
}

describe('WCAG AA contrast of text tokens (RNF-6)', () => {
  const bg = token('bg')
  // worst-case surfaces: page, raised panel, active preset card
  const surfaces = {
    page: bg,
    bg2: token('bg-2'),
    panel: over(token('accent-deep'), 0.55, bg),
    active: over(token('accent'), 0.18, bg),
  }

  for (const t of ['text', 'accent', 'accent-dim', 'amber']) {
    for (const [name, surface] of Object.entries(surfaces)) {
      it(`--${t} on ${name} ≥ 4.5:1`, () => {
        // active (selected) surfaces only carry the primary text colour
        if (name === 'active' && !['text', 'accent'].includes(t)) return
        expect(ratio(token(t), surface)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('keeps the SPEC #8A2B2B only for non-text strokes', () => {
    expect(token('line-dim').toLowerCase()).toBe('#8a2b2b')
    expect(ratio(token('line-dim'), bg)).toBeLessThan(4.5)
  })
})
