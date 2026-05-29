import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers'

/**
 * Auth guard for F4 /transfers route.
 * Verifies that unauthenticated users are redirected to /login
 * and that the return-URL mechanism brings them back after login.
 *
 * All tests run without storage state (unauthenticated).
 */

test.describe('F4 auth guard — /transfers route', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('/transfers should redirect to /login when visited unauthenticated', async ({
    page,
  }) => {
    await page.goto('/transfers')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/transfers?tab=outgoing should redirect to /login when visited unauthenticated', async ({
    page,
  }) => {
    await page.goto('/transfers?tab=outgoing')
    // ProtectedRoute encodes only location.pathname, so the query string is not
    // preserved in the next param — the redirect lands on /login?next=%2Ftransfers
    await expect(page).toHaveURL(/\/login\?next=%2Ftransfers/)
  })

  test('return URL should redirect to /transfers after login when next param is set', async ({
    page,
  }) => {
    await page.goto('/transfers')
    await expect(page).toHaveURL(/\/login\?next=%2Ftransfers/)

    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('/transfers')
    await expect(page).toHaveURL('/transfers')
  })
})
