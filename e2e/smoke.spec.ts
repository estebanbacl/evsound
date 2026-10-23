import { expect, test } from '@playwright/test'

test('navigates the three tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'VEHICLE' })).toBeVisible()
  await page.getByRole('link', { name: 'Escuchar' }).click()
  await expect(page.getByRole('heading', { name: 'LISTEN' })).toBeVisible()
  await page.getByRole('link', { name: 'Dinámica' }).click()
  await expect(page.getByRole('heading', { name: 'DYNAMICS' })).toBeVisible()
})
