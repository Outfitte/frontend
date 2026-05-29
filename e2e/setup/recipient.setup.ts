import { test as setup } from '@playwright/test'
import { registerRecipient } from '../helpers'

const AUTH_FILE = 'e2e/.auth/recipient.json'

/**
 * Register the recipient account (idempotent — falls back to login if already registered)
 * and save the storage state for use in two-user specs.
 */
setup('register recipient and save auth state', async ({ page }) => {
  await registerRecipient(page)
  await page.context().storageState({ path: AUTH_FILE })
})
