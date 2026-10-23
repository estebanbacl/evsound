import { test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

const pages = [
  ['vehicle', '/#/vehicle'],
  ['dynamics', '/#/dynamics'],
  ['listen', '/#/listen'],
  ['ui-catalog', '/#/dev/ui'],
]

test.describe('screenshots', () => {
  test.skip(!process.env.SHOTS, 'run with SHOTS=1 to refresh docs/screenshots')
  for (const [name, url] of pages) {
    test(name, async ({ page }, info) => {
      await skipOnboarding(page)
      await page.goto(url)
      await page.waitForTimeout(600)
      await page.screenshot({ path: `docs/screenshots/${name}-${info.project.name}.png` })
    })
  }
})
