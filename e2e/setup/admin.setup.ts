import { test as setup, expect, request } from '@playwright/test'
import { adminLogin } from '../helpers'

const AUTH_FILE = 'e2e/.auth/admin.json'

/**
 * Authenticate as admin and save the storage state.
 *
 * Also ensures a suitable test item exists: at least one active item
 * with a photo placeholder and one wear log. Uses the API directly so
 * setup is fast and does not depend on UI interactions.
 */
setup('authenticate admin and ensure test item exists', async ({ page }) => {
  await adminLogin(page)
  await expect(page).toHaveURL('/')

  // Verify at least one active item with a wear log exists via the API
  const ctx = await request.newContext({
    baseURL: page.url().replace(/\/$/, '').replace(/\/[^/]+$/, ''),
    extraHTTPHeaders: {
      // Re-use the session cookies from the authenticated browser context
      Cookie: await page
        .context()
        .cookies()
        .then((cs) => cs.map((c) => `${c.name}=${c.value}`).join('; ')),
    },
  })

  const itemsRes = await ctx.get('/api/items')
  const items: Array<{ id: string; status: string }> = await itemsRes.json()
  const activeItems = items.filter((i) => i.status === 'active')

  if (activeItems.length === 0) {
    throw new Error(
      'Admin user has no active items. Create at least one active item with a wear log before running e2e tests.',
    )
  }

  // Check that at least one active item has a wear log
  let itemWithWearLog = false
  for (const item of activeItems) {
    const logsRes = await ctx.get(`/api/items/${item.id}/wear-logs`)
    if (logsRes.ok()) {
      const logs: unknown[] = await logsRes.json()
      if (logs.length > 0) {
        itemWithWearLog = true
        break
      }
    }
  }

  if (!itemWithWearLog) {
    throw new Error(
      'Admin user has no items with wear logs. Add at least one wear log to an active item before running e2e tests.',
    )
  }

  await ctx.dispose()
  await page.context().storageState({ path: AUTH_FILE })
})

