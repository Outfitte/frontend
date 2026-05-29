import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for end-to-end tests.
 *
 * BASE_URL — the running app under test (default: http://localhost:8080).
 * ADMIN_EMAIL / ADMIN_PASSWORD / RECIPIENT_EMAIL / RECIPIENT_PASSWORD —
 *   override default credentials (see e2e/helpers.ts).
 *
 * The two setup projects run first:
 *   - setup-admin    authenticates the admin and saves e2e/.auth/admin.json
 *   - setup-recipient registers/logs in the recipient and saves e2e/.auth/recipient.json
 *
 * All main test projects depend on both setup projects.
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup-admin',
      testMatch: /setup\/admin\.setup\.ts/,
    },
    {
      name: 'setup-recipient',
      testMatch: /setup\/recipient\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup-admin', 'setup-recipient'],
    },
  ],
})
