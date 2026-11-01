import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test('first run: instructions, vehicle choice, validation, persistence across reload', async ({
  page,
}) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu vehículo. Tu sonido.' })).toBeVisible()
  await expect(dialog.getByText('Estaciona tu vehículo')).toBeVisible()
  await page.getByRole('button', { name: /Continuar a selección de vehículo/ }).click()

  await page.getByRole('radio', { name: /Tesla Model 3/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  // nothing is reported as available until it is actually checked
  await expect(page.getByText('Sin comprobar')).toBeVisible()
  await expect(dialog.getByRole('status')).toContainText('Configuración pendiente')
  // going back keeps the choice
  await page.getByRole('button', { name: 'Atrás' }).click()
  await expect(page.getByRole('radio', { name: /Tesla Model 3/ })).toBeChecked()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('button', { name: 'Explorar experiencia de sonido' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/#\/listen/) // not fully ready → goes to relaxation sounds
  await page.getByRole('link', { name: 'Vehículo' }).click()
  await expect(page.getByRole('heading', { name: 'Model 3' })).toBeVisible()
  await page.reload()
  // returning visit: the instructions popup opens first, then Go leads to the saved vehicle
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: 'Vehículo' }).click()
  await expect(page.getByRole('heading', { name: 'Model 3' })).toBeVisible()
})

test('every visit opens with the instructions popup; Go dismisses it', async ({ page }) => {
  await skipOnboarding(page)
  await page.addInitScript(() => sessionStorage.removeItem('ev-skip-intro'))
  await page.goto('/#/vehicle')
  await expect(page.getByRole('heading', { name: 'Tu vehículo. Tu sonido.' })).toBeVisible()
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.vehicle-canvas')).toHaveAttribute('data-vehicle', 'tesla-model-y')
})

test('help re-opens the instructions without touching the vehicle', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/#/vehicle')
  await page.getByRole('button', { name: 'Ayuda' }).click()
  await expect(page.getByRole('heading', { name: 'Tu vehículo. Tu sonido.' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.vehicle-canvas')).toHaveAttribute('data-vehicle', 'tesla-model-y')
})

test('vehicle is changed only through the modal, with confirmation, and persists', async ({
  page,
}) => {
  await skipOnboarding(page)
  await page.goto('/#/vehicle')
  const canvas = page.locator('.vehicle-canvas')
  await expect(canvas).toHaveAttribute('data-vehicle', 'tesla-model-y')
  await expect(canvas.locator('img')).toBeVisible()
  await expect(page.getByText('384 kW (517 hp)')).toBeVisible()
  // no permanent selector, no trim/motor/drivetrain in the identification
  await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(page.getByText(/Juniper|Highland|Dual Motor|4x4/)).toHaveCount(0)
  await expect(page.getByText('Tesla Model Y')).toBeVisible()

  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Cambiar vehículo' })
  await expect(modal.getByRole('radio', { name: /Tesla Model Y/ })).toBeChecked()
  const confirm = modal.getByRole('button', { name: 'Confirmar cambio' })
  await expect(confirm).toBeDisabled()

  // picking a card alone changes nothing; Escape cancels
  await modal.getByRole('radio', { name: /iCAR 03/ }).click()
  await expect(confirm).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(canvas).toHaveAttribute('data-vehicle', 'tesla-model-y')

  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await page.getByRole('radio', { name: /iCAR 03/ }).click()
  await page.getByRole('button', { name: 'Confirmar cambio' }).click()
  await expect(canvas).toHaveAttribute('data-vehicle', 'icar-03')
  await expect(page.getByText('205 kW (275 hp)')).toBeVisible()
  await expect(page.getByText('501 km')).toBeVisible()

  await page.reload()
  await expect(page.locator('.vehicle-canvas')).toHaveAttribute('data-vehicle', 'icar-03')
})

test('legacy persisted vehicle ids are migrated', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'ev-vehicle',
      JSON.stringify({ state: { vehicleId: 'icar-03-4x4', onboarded: true }, version: 1 }),
    ),
  )
  await page.goto('/#/vehicle')
  await expect(page.locator('.vehicle-canvas')).toHaveAttribute('data-vehicle', 'icar-03')
})

test('the 3D render is not blank', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/#/vehicle')
  await page.waitForTimeout(1500)
  const shot = await page.locator('.vehicle-canvas').screenshot()
  // A blank transparent canvas compresses to a tiny PNG; geometry makes it much bigger.
  expect(shot.length).toBeGreaterThan(8_000)
})
