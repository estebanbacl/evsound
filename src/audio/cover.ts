import type { AmbientCover } from './ambientCatalog'

const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32

/** Original generated cover art (SVG string). Deterministic from the collection's seed. */
export function coverSvg(c: AmbientCover, size = 512): string {
  const r = rng(c.seed)
  const { hue } = c
  const col = (l: number, a = 1) => `hsla(${hue}, 85%, ${l}%, ${a})`
  const stars = Array.from({ length: 60 }, () => {
    const x = (r() * size).toFixed(1)
    const y = (r() * size * 0.7).toFixed(1)
    const o = (0.2 + r() * 0.6).toFixed(2)
    return `<circle cx="${x}" cy="${y}" r="${(0.4 + r() * 1.2).toFixed(1)}" fill="#fff" opacity="${o}"/>`
  }).join('')

  const W = size
  let art: string
  switch (c.style) {
    case 'orbit':
      art = `
      <circle cx="${W * 0.38}" cy="${W * 0.36}" r="${W * 0.09}" fill="url(#glow)"/>
      <circle cx="${W * 0.38}" cy="${W * 0.36}" r="${W * 0.012}" fill="#fff"/>
      <ellipse cx="${W * 0.5}" cy="${W * 1.18}" rx="${W * 0.95}" ry="${W * 0.5}" fill="#050505" stroke="${col(75)}" stroke-width="2"/>
      <ellipse cx="${W * 0.5}" cy="${W * 1.18}" rx="${W * 0.95}" ry="${W * 0.5}" fill="none" stroke="${col(55, 0.35)}" stroke-width="10" filter="url(#blur)"/>`
      break
    case 'rain': {
      const drops = Array.from({ length: 70 }, () => {
        const x = r() * W
        const y = r() * W
        const l = 20 + r() * 50
        return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - 6).toFixed(1)}" y2="${(y + l).toFixed(1)}" stroke="${col(70, 0.35)}" stroke-width="1.5"/>`
      }).join('')
      const lights = Array.from({ length: 9 }, () => {
        const x = r() * W
        const y = W * (0.62 + r() * 0.3)
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(10 + r() * 26).toFixed(1)}" fill="${col(55, 0.35)}" filter="url(#blur)"/>`
      }).join('')
      art = `${lights}${drops}`
      break
    }
    case 'forest': {
      art = Array.from({ length: 16 }, (_, k) => {
        const x = (k / 15) * W * 1.1 - W * 0.05 + (r() - 0.5) * 20
        const h = W * (0.35 + r() * 0.4)
        const w = W * (0.05 + r() * 0.05)
        const l = 18 + r() * 30
        return `<polygon points="${x},${W} ${x - w},${W} ${x - w * 0.15},${W - h} ${x + w * 0.15},${W - h * 0.98}" fill="${col(l, 0.9)}" stroke="${col(60, 0.5)}"/>
        <circle cx="${x}" cy="${W - h}" r="${w * 1.6}" fill="${col(45, 0.18)}" filter="url(#blur)"/>`
      }).join('')
      break
    }
    case 'sea': {
      art = Array.from({ length: 7 }, (_, k) => {
        const y = W * (0.5 + k * 0.08)
        const a = 6 + k * 3
        let d = `M0 ${y}`
        for (let x = 0; x <= W; x += W / 8)
          d += ` Q ${x + W / 16} ${y - a - r() * 6} ${x + W / 8} ${y}`
        return `<path d="${d}" fill="none" stroke="${col(40 + k * 6, 0.8)}" stroke-width="${1.5 + k * 0.4}"/>`
      }).join('')
      art += `<circle cx="${W * 0.72}" cy="${W * 0.3}" r="${W * 0.1}" fill="url(#glow)"/>`
      break
    }
    case 'night': {
      art =
        `<circle cx="${W * 0.7}" cy="${W * 0.3}" r="${W * 0.1}" fill="${col(88, 0.9)}"/>
      <circle cx="${W * 0.7}" cy="${W * 0.3}" r="${W * 0.2}" fill="url(#glow)"/>` +
        Array.from({ length: 12 }, (_, k) => {
          const x = (k / 11) * W
          const h = W * (0.15 + r() * 0.2)
          return `<polygon points="${x - 20},${W} ${x},${W - h} ${x + 20},${W}" fill="#050507"/>`
        }).join('')
      break
    }
    default: {
      art = Array.from({ length: 5 }, (_, k) => {
        const y = W * (0.3 + k * 0.1)
        let d = `M0 ${y}`
        for (let x = 12; x <= W; x += 12) d += ` L ${x} ${y + (r() - 0.5) * (14 + k * 6)}`
        return `<path d="${d}" fill="none" stroke="${col(55 + k * 5, 0.7)}" stroke-width="1.5"/>`
      }).join('')
    }
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

export const coverDataUri = (c: AmbientCover, size = 512) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(coverSvg(c, size))}`
