import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test('navigates the three tabs', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Vehículo' })).toBeVisible()
  await page.getByRole('link', { name: 'Escuchar' }).click()
  await expect(page.getByRole('heading', { name: 'LISTEN' })).toBeVisible()
  await page.getByRole('link', { name: 'Dinámica' }).click()
  await expect(page.getByRole('region', { name: 'Dinámica' })).toBeVisible()
})
