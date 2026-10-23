import { expect, test } from '@playwright/test'

test('audio dev: engine starts after a gesture and produces signal that follows the throttle', async ({
  page,
}) => {
  await page.goto('/#/dev/audio')
  await expect(page.getByTestId('audio-readout')).toContainText('audio uninitialized')
  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByTestId('audio-readout')).toContainText('audio running')

  // Full throttle via the keyboard hook; the readout must show rpm climbing above idle.
  await page.keyboard.down('ArrowUp')
  await expect
    .poll(
      async () => {
        const m = /([\d]+) rpm/.exec((await page.getByTestId('audio-readout').textContent()) ?? '')
        return m ? Number(m[1]) : 0
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(3000)
  await page.keyboard.up('ArrowUp')

  // Real signal reaching the analyser at the end of the chain (after master + limiter).
  await expect
    .poll(async () => {
      const m = /nivel ([\d.]+)/.exec((await page.getByTestId('audio-readout').textContent()) ?? '')
      return m ? Number(m[1]) : 0
    })
    .toBeGreaterThan(0.001)
})
