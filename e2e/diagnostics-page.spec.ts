import { expect, test } from '@playwright/test'

test('sprint 0 diagnostics page: env, features, audio tone, GPS samples and JSON export', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 4.711, longitude: -74.072, accuracy: 10 })
  await page.goto('/diagnostics/index.html')
  await expect(page.getByRole('heading', { name: 'Diagnóstico de campo' })).toBeVisible()
  await expect(page.locator('#env')).toContainText('Chromium')
  await expect(page.locator('#features')).toContainText('WebGL2')
  await expect(page.locator('#features')).toContainText('Media Session')

  await page.getByRole('button', { name: 'Iniciar audio' }).click()
  await expect(page.locator('#a-state')).toHaveText('running')
  await expect(page.locator('#a-base')).toContainText('ms')

  await page.getByRole('button', { name: 'Iniciar GPS' }).click()
  await expect(page.locator('#g-n')).not.toHaveText('0', { timeout: 10_000 })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar log (JSON)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ev-field-diagnostics-\d+\.json$/)
  const log = JSON.parse(await page.locator('#log').innerText())
  expect(log.env.userAgent).toBeTruthy()
  expect(log.gps.length).toBeGreaterThan(0)
  expect(log.events.map((e: { name: string }) => e.name)).toEqual(
    expect.arrayContaining(['page.loaded', 'audio.started', 'gps.started']),
  )
})
