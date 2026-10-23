import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

const screens = [
  ['vehicle', '/#/vehicle'],
  ['listen', '/#/listen'],
  ['listen-detail', '/#/listen/orbita'],
  ['dynamics', '/#/dynamics'],
] as const

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page)
})

for (const [name, url] of screens) {
  test(`a11y (WCAG AA contrast + names): ${name}`, async ({ page }) => {
    await page.goto(url)
    await page.waitForTimeout(800)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      results.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join(' | ')}`,
      ),
    ).toEqual([])
  })
}

test('onboarding dialog is accessible', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})

// RNF-6: touch targets >= 48 px on every screen.
for (const [name, url] of screens) {
  test(`touch targets >= 48 px: ${name}`, async ({ page }) => {
    await page.goto(url)
    await page.waitForTimeout(500)
    const small = await page.evaluate(() => {
      const sel = 'button, a[href], [role=radio], input[type=range], select'
      return [...document.querySelectorAll<HTMLElement>(sel)]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 47.5 || r.width < 47.5))
        .map(
          ({ el, r }) =>
            `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20)}] ${Math.round(r.width)}x${Math.round(r.height)}`,
        )
    })
    expect(small).toEqual([])
  })
}
