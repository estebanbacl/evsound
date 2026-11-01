import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

// Service worker only exists in the production build served by `vite preview` (see webServer).
test.describe('PWA', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
  })

  test('is installable (manifest, icons, service worker): no installability errors', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    const cdp = await context.newCDPSession(page)
    const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
      installabilityErrors: { errorId: string }[]
    }
    expect(installabilityErrors).toEqual([])
    const manifest = await page.evaluate(async () => {
      const href = document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href
      return (await fetch(href)).json()
    })
    expect(manifest).toMatchObject({ short_name: 'EV Sound', display: 'standalone', lang: 'es' })
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
  })

  test('downloads a pack, then the app and that pack work fully offline', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload() // now controlled by the SW
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)

    await page.goto('/#/listen')
    const pack = page
      .getByRole('region', { name: 'Sonidos descargados' })
      .or(page.locator('.packs'))
    await expect(pack.getByText('No descargado').first()).toBeVisible()
    await page.getByRole('button', { name: 'Descargar Naturaleza' }).click()
    await expect(page.getByRole('button', { name: 'Eliminar Naturaleza' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(pack.getByText(/Descargado/).first()).toBeVisible()
    // the other pack is untouched
    await expect(page.getByRole('button', { name: 'Descargar Lluvia' })).toBeVisible()

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('region', { name: 'Escuchar' })).toBeVisible()
    await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible()

    // listen: catalog from cache, sound streamed from the downloaded pack (range requests)
    await page.getByRole('link', { name: /Abrir Naturaleza/ }).click()
    await page.getByRole('button', { name: 'Reproducir Bosque tranquilo' }).click()
    const panel = page.getByRole('complementary', { name: 'Reproduciendo ahora' })
    await expect(panel).toContainText('Bosque tranquilo')
    await expect(panel.getByRole('button', { name: 'Pausar' })).toBeVisible()
    await expect(page.getByText(/No se pudo reproducir/)).toHaveCount(0)

    // a pack that was never downloaded is not available offline
    const missing = await page.evaluate(async () => {
      try {
        const r = await fetch('/sounds/ambient/lluvia/lluvia-ligera.wav')
        return r.ok
      } catch {
        return false
      }
    })
    expect(missing).toBe(false)
    await context.setOffline(false)
  })
})
