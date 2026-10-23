import { expect, test } from '@playwright/test'

test('telemetry dev screen replays the launch trace', async ({ page }) => {
  await page.goto('/#/dev/telemetry')
  await page.getByLabel('Fuente').selectOption('launch')
  await page.getByLabel('Velocidad de reproducción').selectOption('4')
  await page.getByRole('button', { name: 'Iniciar' }).click()
  const readout = page.getByTestId('readout')
  await expect(readout).toContainText('ON')
  await expect
    .poll(async () => {
      const m = /estimado ([\d.]+) km\/h/.exec((await readout.textContent()) ?? '')
      return m ? Number(m[1]) : 0
    })
    .toBeGreaterThan(60)
})
