import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

// RNF-8: no location leaves the device. Use GPS as the source and watch every request.
test('with GPS as the speed source, no request carries the position and only known hosts are contacted', async ({
  page,
  context,
}) => {
  await skipOnboarding(page)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 4.711234, longitude: -74.072345, accuracy: 8 })
  const requests: { url: string; body: string }[] = []
  page.on('request', (r) => requests.push({ url: r.url(), body: r.postData() ?? '' }))

  await page.goto('/#/dynamics')
  await page.getByRole('radio', { name: 'GPS' }).click()
  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()
  // a second fix lets the source derive a speed; the status bar proves the GPS pipeline really ran
  await page.waitForTimeout(1000)
  await context.setGeolocation({ latitude: 4.711234, longitude: -74.072345, accuracy: 8 })
  await expect(page.getByText('GPS: OK')).toBeVisible({ timeout: 8000 })
  await page.getByRole('button', { name: 'Detener motor' }).click()

  const leaks = requests.filter((r) => /4\.7112|74\.0723/.test(r.url + r.body))
  expect(leaks).toEqual([])
  const hosts = new Set(
    requests.map((r) => new URL(r.url).host).filter((h) => h && !h.startsWith('localhost')),
  )
  // Only the Google Fonts stylesheet/files (no location, no cookies of ours) are third-party.
  expect([...hosts].filter((h) => !/^fonts\.(googleapis|gstatic)\.com$/.test(h))).toEqual([])
  expect(
    requests.some(
      (r) => r.url.startsWith('data:') === false && /beacon|analytics|collect/i.test(r.url),
    ),
  ).toBe(false)
})
