import type { Page } from '@playwright/test'

/** Skip the first-run onboarding by seeding the persisted vehicle store. */
export async function skipOnboarding(page: Page, vehicleId = 'tesla-model-y') {
  await page.addInitScript((id) => {
    sessionStorage.setItem('ev-skip-intro', '1') // start past the instructions popup
    if (localStorage.getItem('ev-vehicle')) return // keep what the app persisted across reloads
    localStorage.setItem(
      'ev-vehicle',
      JSON.stringify({ state: { vehicleId: id, onboarded: true }, version: 2 }),
    )
  }, vehicleId)
}
