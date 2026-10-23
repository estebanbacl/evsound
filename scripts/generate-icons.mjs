// Renders the PWA icons (own artwork, no brand marks) with Playwright's Chromium.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const svg = (size, pad) => {
  const c = size / 2
  const r = (size / 2 - pad) * 0.72
  const arc = (from, to, rr) => {
    const p = (a) => [c + rr * Math.cos((a * Math.PI) / 180), c + rr * Math.sin((a * Math.PI) / 180)]
    const [x1, y1] = p(from)
    const [x2, y2] = p(to)
    return `M ${x1} ${y1} A ${rr} ${rr} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  const needle = (340 * Math.PI) / 180
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><filter id="g"><feGaussianBlur stdDeviation="${size * 0.012}"/></filter></defs>
  <rect width="${size}" height="${size}" fill="#050505"/>
  <path d="${arc(135, 405, r)}" fill="none" stroke="#3a0a0a" stroke-width="${size * 0.055}" stroke-linecap="round"/>
  <path d="${arc(135, 340, r)}" fill="none" stroke="#ff2a2a" stroke-width="${size * 0.055}" stroke-linecap="round" filter="url(#g)"/>
  <path d="${arc(135, 340, r)}" fill="none" stroke="#ff2a2a" stroke-width="${size * 0.055}" stroke-linecap="round"/>
  <line x1="${c}" y1="${c}" x2="${c + r * 0.78 * Math.cos(needle)}" y2="${c + r * 0.78 * Math.sin(needle)}" stroke="#ff9f43" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c}" r="${size * 0.05}" fill="#ff9f43"/>
</svg>`
}

const targets = [
  ['public/icons/pwa-192.png', 192, 0],
  ['public/icons/pwa-512.png', 512, 0],
  ['public/icons/pwa-maskable-512.png', 512, 70], // extra padding: maskable safe zone
  ['public/icons/apple-touch-icon.png', 180, 0],
]
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<body style="margin:0">${svg(size, pad)}</body>`)
  writeFileSync(file, await page.screenshot({ omitBackground: false }))
  console.log(file)
}
await browser.close()
writeFileSync('public/favicon.svg', svg(64, 0))
