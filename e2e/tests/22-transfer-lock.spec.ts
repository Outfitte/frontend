import { type Locator, type Page, test, expect } from '@playwright/test'
import { logout, RECIPIENT_EMAIL } from '../helpers'

/**
 * Transfer lock enforcement: pending-item lock state in the UI and 409 backstop.
 *
 * Preconditions (satisfied by admin.setup.ts + recipient.setup.ts):
 *   - Admin has at least one active item with a wear log
 *   - Recipient user exists
 *
 * Covered:
 *   A. Proactive lock (UI gating):
 *      - Items grid: "Transfer pending" badge; context-menu and "Wore today" absent;
 *        no second "Transfer…" entry (entire menu is hidden)
 *      - Item detail: pending banner; Edit / Archive / Share / Dispose / Delete /
 *        Log-wear / Transfer buttons absent; wear-log delete buttons absent
 *   B. Backstop (reactive 409):
 *      - Stale-cache scenario: item detail loaded before transfer is created;
 *        mutation fires against locked item → 409 → error toast; page stays put
 *   C. Unlock on resolution:
 *      - Cancel transfer from Outgoing tab → all affordances restored in grid + detail
 *   D. Outfit builder (documented behaviour):
 *      - ItemPicker does NOT proactively gate locked items; the locked item appears in
 *        the picker and the 409 is surfaced reactively when "Add" is clicked
 */

// ── helpers ──────────────────────────────────────────────────────────────────

interface FoundItem {
  card: Locator
  name: string
  id: string
}

/** Return the first active item card whose context menu is not locked. */
async function findFirstUnlockedItem(page: Page): Promise<FoundItem> {
  await page.goto('/items')
  await expect(page.getByTestId('items-page')).toBeVisible()

  const cards = page.getByTestId('item-card')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    const optionsBtn = card.getByRole('button', { name: 'Item options' })
    if (await optionsBtn.isVisible()) {
      const name =
        (await card.locator('p.font-medium').first().textContent()) ?? ''
      const href =
        (await card
          .locator('a[href^="/items/"]')
          .first()
          .getAttribute('href')) ?? ''
      const id = href.replace('/items/', '').split('/')[0]
      expect(name).not.toBe('')
      expect(id).not.toBe('')
      return { card, name, id }
    }
  }

  throw new Error(
    'No unlocked active item found. Ensure admin has at least one active item without a pending transfer.'
  )
}

/** Open the Transfer dialog from an item card and submit to RECIPIENT_EMAIL. */
async function initiateTransferViaUI(
  page: Page,
  card: Locator,
  itemName: string
): Promise<void> {
  await card.getByRole('button', { name: 'Item options' }).click()
  await expect(page.getByRole('menuitem', { name: 'Transfer…' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Transfer…' }).click()

  const dialog = page.getByRole('dialog', { name: `Transfer ${itemName}` })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(RECIPIENT_EMAIL)).toBeVisible()
  await dialog.getByText(RECIPIENT_EMAIL).click()
  await dialog.getByRole('button', { name: 'Transfer' }).click()

  await expect(page.getByText('Transfer sent')).toBeVisible()
  await expect(dialog).not.toBeVisible()
}

/**
 * Cancel a pending outgoing transfer for itemName from the Outgoing tab.
 * Expects the row's status badge to update to "cancelled" after confirmation.
 */
async function cancelTransferViaUI(
  page: Page,
  itemName: string
): Promise<void> {
  await page.goto('/transfers?tab=outgoing')
  await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

  const row = page
    .getByTestId('outgoing-transfers')
    .locator('[data-testid^="transfer-row-"]')
    .filter({ hasText: itemName })
    .first()
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Cancel transfer' }).click()
  // AlertDialog confirmation
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Confirm cancel' })
    .click()

  await expect(row.getByText('cancelled')).toBeVisible()
}

// ── test suite ────────────────────────────────────────────────────────────────

test.describe('Transfer lock enforcement — proactive gate, backstop 409, unlock', () => {
  /**
   * Track the ID of any pending transfer created during a test so afterEach can
   * cancel it if the test fails before cleaning up.
   */
  let pendingTransferId: string | null = null

  // ── A. Proactive lock — items grid ──────────────────────────────────────────

  test('locked item should show Transfer-pending badge and hide context menu and Wore-today button when transfer is pending', async ({
    page,
  }) => {
    const { card, name } = await findFirstUnlockedItem(page)
    await initiateTransferViaUI(page, card, name)

    // Capture the transfer ID via API for afterEach cleanup
    const outRes = await page.request.get('/api/transfers/outgoing')
    const outgoing: Array<{ id: string; item: { name: string } }> =
      await outRes.json()
    const match = outgoing.find((t) => t.item.name === name)
    expect(match).toBeDefined()
    pendingTransferId = match!.id

    // Find the now-locked card
    const lockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()

    // Badge is visible
    await expect(lockedCard.getByTestId('item-locked-badge')).toBeVisible()
    await expect(lockedCard.getByText('Transfer pending')).toBeVisible()

    // Context-menu trigger is hidden (entire menu is gone — no second Transfer… entry)
    await expect(
      lockedCard.getByRole('button', { name: 'Item options' })
    ).not.toBeVisible()

    // Wore-today button is hidden
    await expect(
      lockedCard.getByRole('button', { name: 'Wore today' })
    ).not.toBeVisible()

    // Cancel so the item is available for subsequent tests
    await cancelTransferViaUI(page, name)
    pendingTransferId = null
  })

  // ── A. Proactive lock — item detail ─────────────────────────────────────────

  test('item detail should show pending banner and hide all mutation affordances when transfer is pending', async ({
    page,
  }) => {
    const { card, name, id } = await findFirstUnlockedItem(page)
    await initiateTransferViaUI(page, card, name)

    // Capture transfer ID for afterEach cleanup
    const outRes = await page.request.get('/api/transfers/outgoing')
    const outgoing: Array<{ id: string; item: { name: string } }> =
      await outRes.json()
    const match = outgoing.find((t) => t.item.name === name)
    expect(match).toBeDefined()
    pendingTransferId = match!.id

    await page.goto(`/items/${id}`)
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    // Pending banner is shown
    const banner = page.getByTestId('item-transfer-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('pending transfer')

    // All mutation affordances are absent
    await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: /archive/i })
    ).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Share' })).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Dispose' })
    ).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Log wear' })
    ).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Transfer' })
    ).not.toBeVisible()

    // Wear-log delete buttons are absent (locked state hides them)
    await expect(
      page.getByRole('button', { name: 'Delete wear log' })
    ).not.toBeVisible()

    // Cancel for cleanup
    await cancelTransferViaUI(page, name)
    pendingTransferId = null
  })

  // ── C. Unlock on resolution ───────────────────────────────────────────────

  test('all affordances should be restored in grid and detail when pending transfer is cancelled', async ({
    page,
  }) => {
    const { card, name, id } = await findFirstUnlockedItem(page)
    await initiateTransferViaUI(page, card, name)

    // Capture transfer ID
    const outRes = await page.request.get('/api/transfers/outgoing')
    const outgoing: Array<{ id: string; item: { name: string } }> =
      await outRes.json()
    const match = outgoing.find((t) => t.item.name === name)
    expect(match).toBeDefined()
    pendingTransferId = match!.id

    // Cancel the transfer from the Outgoing tab
    await cancelTransferViaUI(page, name)
    pendingTransferId = null

    // ── Items grid: affordances restored ──────────────────────────────────────
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const unlockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()

    await expect(
      unlockedCard.getByTestId('item-locked-badge')
    ).not.toBeVisible()
    await expect(
      unlockedCard.getByRole('button', { name: 'Item options' })
    ).toBeVisible()
    await expect(
      unlockedCard.getByRole('button', { name: 'Wore today' })
    ).toBeVisible()

    // ── Item detail: affordances restored ─────────────────────────────────────
    await page.goto(`/items/${id}`)
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    await expect(page.getByTestId('item-transfer-banner')).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log wear' })).toBeVisible()
  })

  // ── B. Backstop — stale-cache reactive 409 ───────────────────────────────

  test('mutation should show 409 error toast and not navigate when item is locked and cache is stale', async ({
    page,
  }) => {
    // 1. Find an unlocked item and navigate to its detail page.
    //    React Query fetches /transfers/outgoing at mount → no pending transfers.
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()
    const firstCard = page.getByTestId('item-card').first()
    const href =
      (await firstCard
        .locator('a[href^="/items/"]')
        .first()
        .getAttribute('href')) ?? ''
    const itemId = href.replace('/items/', '').split('/')[0]
    expect(itemId).not.toBe('')

    await page.goto(`/items/${itemId}`)
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    // Delete button is visible — no pending transfer yet
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()

    // 2. Locate the recipient user ID via the API (using the page's auth context)
    const usersRes = await page.request.get('/api/users')
    expect(usersRes.ok()).toBeTruthy()
    const users: Array<{ id: string; email: string }> = await usersRes.json()
    const recipient = users.find((u) => u.email === RECIPIENT_EMAIL)
    expect(recipient).toBeDefined()

    // 3. Create a transfer directly via API — bypasses React Query so the UI cache
    //    remains stale: the detail page still renders "Delete" as if no transfer exists.
    const transferRes = await page.request.post('/api/transfers', {
      data: {
        item_id: itemId,
        recipient_id: recipient!.id,
        include_history: false,
      },
    })
    expect(transferRes.ok()).toBeTruthy()
    const transfer: { id: string } = await transferRes.json()
    pendingTransferId = transfer.id

    // 4. Attempt the delete mutation on the still-visible button.
    //    The backend enforces ErrItemTransferPending and returns 409.
    await page.getByRole('button', { name: 'Delete' }).click()
    // AlertDialog confirmation step
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Confirm delete' })
      .click()

    // 5. 409 → error toast is shown; the page does NOT navigate away
    await expect(page.getByRole('status').first()).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/items/${itemId}`))

    // Cleanup: cancel the transfer
    await page.request
      .post(`/api/transfers/${pendingTransferId}/cancel`)
      .catch(() => {})
    pendingTransferId = null
  })

  // ── D. Outfit builder — reactive 409 (documented behaviour) ───────────────

  /**
   * The ItemPicker component fetches only "active" items and does NOT proactively
   * filter by transfer-pending status. Therefore a locked item appears in the picker
   * and the 409 is surfaced reactively when the user clicks "Add".
   *
   * This test:
   *   1. Creates a temporary outfit
   *   2. Creates a pending transfer on an item
   *   3. Navigates to the outfit's edit page
   *   4. Opens the item picker and verifies the locked item is listed (no proactive gate)
   *   5. Clicks "Add" on the locked item → error toast (409 backstop)
   *   6. Cleans up both the transfer and the outfit
   */
  test('outfit builder should surface 409 error toast and not proactively hide locked item in item picker', async ({
    page,
  }) => {
    // 1. Find an unlocked item
    const { name } = await findFirstUnlockedItem(page)

    // 2. Create a new outfit via the UI
    await page.goto('/outfits')
    await expect(page.getByTestId('outfits-page')).toBeVisible()
    await page.getByRole('link', { name: 'Create outfit' }).first().click()

    await expect(page.getByTestId('create-outfit-page')).toBeVisible()
    await page.getByLabel('Name').fill('Lock-test outfit')
    await page.getByRole('button', { name: 'Create' }).click()

    // Redirected to /outfits/{id}/edit
    await expect(page.getByTestId('edit-outfit-page')).toBeVisible()
    const outfitEditUrl = page.url()
    const outfitId = outfitEditUrl.match(/\/outfits\/([^/]+)\/edit/)?.[1] ?? ''
    expect(outfitId).not.toBe('')

    // 3. Initiate a transfer for the item (lock it)
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    // Re-locate the card after navigation
    const refreshedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await initiateTransferViaUI(page, refreshedCard, name)

    // Capture transfer ID for afterEach cleanup
    const outRes = await page.request.get('/api/transfers/outgoing')
    const outgoing: Array<{ id: string; item: { name: string } }> =
      await outRes.json()
    const match = outgoing.find((t) => t.item.name === name)
    expect(match).toBeDefined()
    pendingTransferId = match!.id

    // 4. Navigate to outfit edit page and open the item picker
    await page.goto(outfitEditUrl)
    await expect(page.getByTestId('edit-outfit-page')).toBeVisible()
    await page.getByRole('button', { name: 'Add item' }).click()

    // 5. The locked item is listed in the picker (no proactive filtering by lock state)
    const pickerDialog = page.getByRole('dialog')
    await expect(pickerDialog).toBeVisible()
    await expect(pickerDialog.getByText(name)).toBeVisible()

    // 6. Click "Add" on the locked item — backend returns 409
    const itemRow = pickerDialog.locator('li').filter({ hasText: name }).first()
    await itemRow.getByRole('button', { name: 'Add' }).click()

    // Error toast is shown (reactive 409 backstop)
    await expect(page.getByRole('status').first()).toBeVisible()

    // Picker is still open (or closed depending on implementation) — page does not crash
    await expect(page.getByTestId('edit-outfit-page')).toBeVisible()

    // Cleanup: cancel the transfer
    await page.request
      .post(`/api/transfers/${pendingTransferId}/cancel`)
      .catch(() => {})
    pendingTransferId = null

    // Cleanup: delete the temporary outfit
    await page.request.delete(`/api/outfits/${outfitId}`).catch(() => {})
  })

  test.afterEach(async ({ page }) => {
    if (pendingTransferId) {
      await page.request
        .post(`/api/transfers/${pendingTransferId}/cancel`)
        .catch(() => {})
      pendingTransferId = null
    }
    await logout(page).catch(() => {})
  })
})
