import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page)
})

test('listen: open a collection, play a track, mini player follows and progresses', async ({
  page,
}) => {
  await page.goto('/#/listen')
  await expect(page.getByText('Para ti')).toBeVisible()
  await page.getByRole('link', { name: /Abrir Órbita/ }).click()
  await expect(page.getByRole('heading', { name: 'Órbita' })).toBeVisible()
  await expect(page.locator('.tracklist li')).toHaveCount(5)

  await page.getByRole('button', { name: /Horizonte lento/ }).click()
  await expect(page.getByRole('button', { name: /Horizonte lento/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
  const mini = page.getByRole('group', { name: 'Reproductor' })
  await expect(mini).toContainText('Horizonte lento')
  // real playback: the elapsed time advances past 00:01
  await expect(mini).not.toContainText('00:00', { timeout: 10_000 })
  await expect(mini.getByRole('button', { name: 'Pausar' })).toBeVisible()

  await mini.getByRole('button', { name: 'Siguiente' }).click()
  await expect(mini).toContainText('Cinturón de polvo')
  await mini.getByRole('button', { name: 'Pausar' }).click()
  await expect(mini.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible()

  // mini player persists across tabs and "recent" shows up on the home
  await page.getByRole('link', { name: 'Dinámica' }).click()
  await expect(mini).toBeVisible()
  await page.getByRole('link', { name: 'Escuchar' }).click()
  await expect(page.getByText('Aún no has escuchado nada.')).toHaveCount(0)
})

test('listen: ducking when the engine runs, pause mode pauses the ambient track', async ({
  page,
}) => {
  await page.goto('/#/listen')
  await page.getByRole('button', { name: 'Reproducir Órbita' }).click()
  const mini = page.getByRole('group', { name: 'Reproductor' })
  await expect(mini.getByRole('button', { name: 'Pausar' })).toBeVisible()

  await page.getByRole('radio', { name: 'Pausar' }).click()
  await page.getByRole('link', { name: 'Dinámica' }).click()
  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()
  await expect(mini.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible()
})
