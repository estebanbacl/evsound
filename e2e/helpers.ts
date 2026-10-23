import type { Page } from '@playwright/test'

/** Skip the first-run onboarding by seeding the persisted vehicle store. */
export async function skipOnboarding(page: Page, vehicleId = 'model-y-juniper-dm') {
  await page.addInitScript((id) => {
    localStorage.setItem(
      'ev-vehicle',
      JSON.stringify({ state: { vehicleId: id, onboarded: true }, version: 1 }),
    )
  }, vehicleId)
}
