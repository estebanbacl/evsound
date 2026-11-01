import { expect, test, type Page } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

declare global {
  interface Window {
    __audios: HTMLMediaElement[]
  }
}

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page)
  // record every media element that starts playing, to assert real playback
  await page.addInitScript(() => {
    window.__audios = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!window.__audios.includes(this)) window.__audios.push(this)
      return play.call(this)
    }
  })
})

const audio = (page: Page) =>
  page.evaluate(() => {
    const a = window.__audios[0]
    return a ? { t: a.currentTime, paused: a.paused, loop: a.loop, src: a.currentSrc } : null
  })

test('listen: six categories, no GPS prompt, nothing plays on its own', async ({ page }) => {
  let asked = false
  await page.exposeFunction('geoAsked', () => (asked = true))
  await page.addInitScript(() => {
    const g = navigator.geolocation
    if (g) {
      g.getCurrentPosition = () => void (window as never as { geoAsked: () => void }).geoAsked()
      g.watchPosition = () => (void (window as never as { geoAsked: () => void }).geoAsked(), 0)
    }
  })
  await page.goto('/#/listen')
  await expect(page.getByRole('heading', { name: 'Escuchar' })).toBeVisible()
  for (const c of [
    'Naturaleza',
    'Mar y océano',
    'Lluvia',
    'Noche y descanso',
    'Ruido blanco',
    'Ambiental',
  ])
    await expect(page.getByRole('link', { name: `Abrir ${c}` })).toBeVisible()
  await expect(page.getByText('Nada en reproducción')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(await audio(page)).toBeNull()
  expect(asked).toBe(false)
})

test('listen: play a real looping sound, pause/resume, volume, timer, favourite, mini player', async ({
  page,
}) => {
  await page.goto('/#/listen')
  await page.getByRole('link', { name: 'Abrir Naturaleza' }).click()
  await expect(page.getByRole('button', { name: /^Reproducir / })).toHaveCount(4)

  await page.getByRole('button', { name: 'Reproducir Bosque tranquilo' }).click()
  const panel = page.getByRole('complementary', { name: 'Reproduciendo ahora' })
  await expect(panel).toContainText('Bosque tranquilo')
  await expect(panel).toContainText('Naturaleza · Sonido ambiental')
  // real playback of the generated file, looping, advancing
  await expect.poll(async () => (await audio(page))?.t ?? 0, { timeout: 10_000 }).toBeGreaterThan(1)
  const a = await audio(page)
  expect(a?.loop).toBe(true)
  expect(a?.src).toContain('/sounds/ambient/naturaleza/bosque-tranquilo.wav')

  // independent volume + timer
  await panel.getByRole('slider', { name: 'Volumen de paisajes' }).fill('0.2')
  await panel.getByRole('radio', { name: '15' }).click()
  await expect(panel).toContainText('restantes')

  await panel.getByRole('button', { name: 'Pausar' }).click()
  await expect.poll(async () => (await audio(page))?.paused, { timeout: 5_000 }).toBe(true)
  await panel.getByRole('button', { name: 'Reproducir' }).click()
  await expect.poll(async () => (await audio(page))?.paused, { timeout: 5_000 }).toBe(false)

  // favourite survives, shows on the home
  await page.getByRole('button', { name: /Añadir a favoritos: Bosque tranquilo/ }).click()

  // mini player follows on other tabs
  await page.getByRole('link', { name: 'Dinámica' }).click()
  const mini = page.getByRole('group', { name: 'Reproductor' })
  await expect(mini).toContainText('Bosque tranquilo')
  await mini.getByRole('button', { name: 'Detener' }).click()
  await expect.poll(async () => (await audio(page))?.paused, { timeout: 5_000 }).toBe(true)

  await page.getByRole('link', { name: 'Escuchar' }).click()
  await expect(page.getByText('Marca un sonido con la estrella')).toHaveCount(0)
  await expect(page.getByText('Aún no has escuchado nada.')).toHaveCount(0)
})

test('listen: the four priority sounds exist as real audio files', async ({ page, request }) => {
  for (const f of [
    'naturaleza/bosque-tranquilo',
    'mar-y-oceano/olas-suaves',
    'mar-y-oceano/lluvia-en-el-mar',
    'noche-y-descanso/noche-en-el-bosque',
  ]) {
    const r = await request.get(`/sounds/ambient/${f}.wav`)
    expect(r.ok()).toBe(true)
    expect((await r.body()).length).toBeGreaterThan(100_000)
  }
  await page.goto('/#/listen/mar-y-oceano')
  await expect(page.getByRole('button', { name: 'Reproducir Lluvia en el mar' })).toBeVisible()
})

test('listen: by default sounds and the simulated engine pause each other', async ({ page }) => {
  await page.goto('/#/listen')
  await page.getByRole('link', { name: 'Abrir Lluvia' }).click()
  await page.getByRole('button', { name: 'Reproducir Lluvia ligera' }).click()
  const panel = page.getByRole('complementary', { name: 'Reproduciendo ahora' })
  await expect(panel.getByRole('radio', { name: 'Pausar' })).toBeChecked()
  await expect(panel.getByRole('button', { name: 'Pausar', exact: true }).first()).toBeVisible()

  // engine starts → the ambient sound pauses
  await page.getByRole('link', { name: 'Dinámica' }).click()
  await page.getByRole('button', { name: 'Arrancar motor' }).click()
  await expect(page.getByRole('button', { name: 'Detener motor' })).toBeVisible()
  const mini = page.getByRole('group', { name: 'Reproductor' })
  await expect(mini.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible()

  // an ambient sound starts → the engine stops
  await mini.getByRole('button', { name: 'Reproducir', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Arrancar motor' })).toBeVisible()
})
