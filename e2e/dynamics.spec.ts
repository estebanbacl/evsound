import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page)
})

test('dynamics: presets are sound-only and drive the sliders', async ({ page }) => {
  await page.goto('/#/dynamics')
  await expect(page.getByRole('note').first()).toContainText('no modifican')
  await page.getByRole('radio', { name: /Deportivo/ }).click()
  await expect(page.getByLabel('Intensidad')).toHaveValue('1')
  await page.getByRole('radio', { name: /Confort/ }).click()
  await expect(page.getByLabel('Intensidad')).toHaveValue('0.5')
  await page.getByLabel('Carácter').fill('0.7')
  await expect(page.getByRole('radio', { name: /Confort/ })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('dynamics: preview, then start the virtual engine and rev it with the pedal', async ({
  page,
}) => {
  await page.goto('/#/dynamics')
  await page.getByRole('button', { name: /Probar sonido/ }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Arrancar motor' })).toBeVisible({ timeout: 8000 })

  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()
  const pedal = page.getByRole('button', { name: /Acelerador/ })
  const box = (await pedal.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(
    page.locator('.readout').filter({ hasText: 'Marcha' }).locator('strong'),
  ).not.toHaveText('1', {
    timeout: 15_000,
  })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Detener motor' }).click()
  await expect(page.getByRole('button', { name: 'Arrancar motor' })).toBeVisible()
})

test('drive mode appears after 3 s above 8 km/h and disappears after 5 s below 3 km/h', async ({
  page,
}) => {
  // 10 s stopped, 20 s at 60 km/h, 30 s stopped.
  const trace = [
    ...Array.from({ length: 10 }, (_, t) => ({ t, speedMs: 0 })),
    ...Array.from({ length: 20 }, (_, i) => ({ t: 10 + i, speedMs: 16.7 })),
    ...Array.from({ length: 30 }, (_, i) => ({ t: 30 + i, speedMs: 0 })),
  ]
  await page.route('**/traces/highway.json', (r) => r.fulfill({ json: trace }))
  await page.clock.install()
  await page.goto('/#/dynamics')

  await page.getByRole('radio', { name: 'Traza' }).click()
  await page.getByRole('radio', { name: 'Autopista' }).click()
  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()

  const drive = page.getByRole('region', { name: 'Modo Conducción' })
  await page.clock.runFor(9_000) // still stopped
  await expect(drive).toHaveCount(0)
  await page.clock.runFor(3_000) // t=12 s: moving for ~2 s
  await expect(drive).toHaveCount(0)
  await page.clock.runFor(3_000) // t=15 s: > 3 s sustained
  await expect(drive).toBeVisible()

  // Drive Mode UI: minimal, big targets, no scroll.
  for (const name of ['Detener', 'Subir volumen', 'Bajar volumen', 'Cambiar perfil de sonido']) {
    const b = (await page.getByRole('button', { name }).boundingBox())!
    expect(b.height).toBeGreaterThanOrEqual(64)
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
  ).toBe(true)
  await expect(page.locator('canvas.ev-bg')).toHaveAttribute('data-paused', 'true')

  await page.clock.runFor(15_000) // t=30 s: stops at ~t=30; <3 km/h begins
  await expect(drive).toBeVisible()
  await page.clock.runFor(4_000) // < 5 s below threshold
  await expect(drive).toBeVisible()
  await page.clock.runFor(3_000) // > 5 s
  await expect(drive).toHaveCount(0)
})
