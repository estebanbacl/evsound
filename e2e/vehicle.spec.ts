import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test('first run: safety notice, vehicle choice, persistence across reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Entendido' }).click()
  await page.getByRole('button', { name: 'Vehículo siguiente' }).click()
  await page.getByRole('button', { name: 'Usar este vehículo' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Model 3' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Model 3' })).toBeVisible()
})

test('switching vehicle updates the 3D scene and the specs', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/#/vehicle')
  const canvas = page.locator('.vehicle-canvas')
  await expect(canvas).toHaveAttribute('data-vehicle', 'model-y-juniper-dm')
  await expect(canvas.locator('canvas')).toBeVisible()
  await expect(page.getByText('384 kW (517 hp)')).toBeVisible()

  await page.getByRole('radio', { name: /iCAR 03/ }).click()
  await expect(canvas).toHaveAttribute('data-vehicle', 'icar-03-4x4')
  await expect(page.getByText('205 kW (275 hp)')).toBeVisible()
  await expect(page.getByText('501 km')).toBeVisible()
})

test('the 3D render is not blank', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/#/vehicle')
  await page.waitForTimeout(1500)
  const shot = await page.locator('.vehicle-canvas').screenshot()
  // A blank transparent canvas compresses to a tiny PNG; geometry makes it much bigger.
  expect(shot.length).toBeGreaterThan(8_000)
})
