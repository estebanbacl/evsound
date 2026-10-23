import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    {
      name: 'car',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1200 },
        hasTouch: true,
      },
    },
    {
      name: 'small',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, hasTouch: true },
    },
  ],
})
