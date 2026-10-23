import type { AmbientCollection } from './ambientCatalog'

const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32

/** Original generated cover art (SVG string). Deterministic from the collection's seed. */
export function coverSvg(c: AmbientCollection['cover'], size = 512): string {
  const r = rng(c.seed)
  const { hue } = c
  const col = (l: number, a = 1) => `hsla(${hue}, 85%, ${l}%, ${a})`
  const stars = Array.from({ length: 60 }, () => {
    const x = (r() * size).toFixed(1)
    const y = (r() * size * 0.7).toFixed(1)
    const o = (0.2 + r() * 0.6).toFixed(2)
    return `<circle cx="${x}" cy="${y}" r="${(0.4 + r() * 1.2).toFixed(1)}" fill="#fff" opacity="${o}"/>`
  }).join('')

  let art: string
  if (c.style === 'orbit') {
    art = `
      <circle cx="${size * 0.38}" cy="${size * 0.36}" r="${size * 0.09}" fill="url(#glow)"/>
      <circle cx="${size * 0.38}" cy="${size * 0.36}" r="${size * 0.012}" fill="#fff"/>
      <ellipse cx="${size * 0.5}" cy="${size * 1.18}" rx="${size * 0.95}" ry="${size * 0.5}" fill="#050505" stroke="${col(75)}" stroke-width="2"/>
      <ellipse cx="${size * 0.5}" cy="${size * 1.18}" rx="${size * 0.95}" ry="${size * 0.5}" fill="none" stroke="${col(55, 0.35)}" stroke-width="10" filter="url(#blur)"/>`
  } else {
    const drops = Array.from({ length: 70 }, () => {
      const x = r() * size
      const y = r() * size
      const l = 20 + r() * 50
      return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - 6).toFixed(1)}" y2="${(y + l).toFixed(1)}" stroke="${col(70, 0.35)}" stroke-width="1.5"/>`
    }).join('')
    const lights = Array.from({ length: 9 }, () => {
      const x = r() * size
      const y = size * (0.62 + r() * 0.3)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(10 + r() * 26).toFixed(1)}" fill="${col(55, 0.35)}" filter="url(#blur)"/>`
    }).join('')
    art = `${lights}${drops}`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="${col(50)}" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="${size}" height="${size}" fill="#050507"/>
    <rect width="${size}" height="${size}" fill="${col(8)}"/>
    ${stars}${art}
  </svg>`
}

export const coverDataUri = (c: AmbientCollection['cover'], size = 512) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(coverSvg(c, size))}`
