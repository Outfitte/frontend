import { test, expect } from '@playwright/test'
import {
  switchUser,
  logout,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  RECIPIENT_EMAIL,
  RECIPIENT_PASSWORD,
} from '../helpers'

/**
 * Full transfer happy path: admin sends an item (no history), recipient accepts.
 *
 * Preconditions (satisfied by admin.setup.ts):
 *   - Admin is authenticated (storageState: e2e/.auth/admin.json)
 *   - Admin has at least one active item with a photo and a wear log
 *   - Recipient user exists (created by recipient.setup.ts)
 *
 * Covered: send → lock assertions → outgoing tab → accept → ownership change
 */

test.describe('Transfer happy path — send, accept, ownership change', () => {
  test('admin sends item without history; recipient accepts; ownership transfers', async ({
    page,
  }) => {
    // ── 1. Admin navigates to /items and picks the first unlocked active item ──
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const firstCard = page.getByTestId('item-card').first()
    await expect(firstCard).toBeVisible()

    // Capture the item name so we can find it later
    const itemName =
      (await firstCard.locator('p.font-medium').first().textContent()) ?? ''
    expect(itemName).not.toBe('')

    // Capture item id from the card link href (e.g. /items/<id>)
    const cardLink = firstCard.locator('a[href^="/items/"]').first()
    const href = await cardLink.getAttribute('href')
    const itemId = href?.replace('/items/', '').split('/')[0] ?? ''
    expect(itemId).not.toBe('')

    // ── 2. Open context menu → Transfer… ──
    const optionsButton = firstCard.getByRole('button', {
      name: 'Item options',
    })
    await optionsButton.click()

    const transferMenuItem = page.getByRole('menuitem', { name: 'Transfer…' })
    await expect(transferMenuItem).toBeVisible()
    await transferMenuItem.click()

    // ── 3. Transfer dialog opens ──
    const dialog = page.getByRole('dialog', { name: `Transfer ${itemName}` })
    await expect(dialog).toBeVisible()

    // Recipient is listed; admin (self) is NOT listed
    await expect(dialog.getByText(RECIPIENT_EMAIL)).toBeVisible()
    await expect(dialog.getByText(ADMIN_EMAIL)).not.toBeVisible()

    // ── 4. Leave "Include wear history" UNCHECKED (default), select recipient ──
    const historyCheckbox = dialog.locator('#transfer-history')
    await expect(historyCheckbox).not.toBeChecked()

    await dialog.getByText(RECIPIENT_EMAIL).click()

    // ── 5. Submit transfer ──
    await dialog.getByRole('button', { name: 'Transfer' }).click()

    // Toast: "Transfer sent"; dialog closes
    await expect(page.getByText('Transfer sent')).toBeVisible()
    await expect(dialog).not.toBeVisible()

    // ── 6. Item card shows "Transfer pending" badge; mutations are gated ──
    const lockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: itemName })
      .first()

    await expect(lockedCard.getByTestId('item-locked-badge')).toBeVisible()
    await expect(lockedCard.getByText('Transfer pending')).toBeVisible()

    // Context-menu trigger is gone (card is locked)
    await expect(
      lockedCard.getByRole('button', { name: 'Item options' })
    ).not.toBeVisible()

    // "Wore today" button is gone
    await expect(
      lockedCard.getByRole('button', { name: 'Wore today' })
    ).not.toBeVisible()

    // ── 7. Item detail page — pending banner; action buttons absent ──
    await page.goto(`/items/${itemId}`)
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    const banner = page.getByTestId('item-transfer-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('pending transfer')

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

    // ── 8. /transfers → Outgoing tab shows pending transfer ──
    await page.goto('/transfers?tab=outgoing')
    await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

    const outgoingRow = page
      .getByTestId('outgoing-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .first()
    await expect(outgoingRow).toBeVisible()
    await expect(outgoingRow).toContainText(RECIPIENT_EMAIL)
    await expect(outgoingRow).toContainText(itemName)
    await expect(outgoingRow.getByText('pending')).toBeVisible()

    // ── 9. Switch to recipient ──
    await switchUser(page, RECIPIENT_EMAIL, RECIPIENT_PASSWORD)

    // ── 10. Incoming tab shows the transfer from admin, marked history-excluded ──
    await page.goto('/transfers')
    await expect(page.getByTestId('incoming-transfers')).toBeVisible()

    const incomingRow = page
      .getByTestId('incoming-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .first()
    await expect(incomingRow).toBeVisible()
    await expect(incomingRow).toContainText(ADMIN_EMAIL)
    await expect(incomingRow).toContainText(itemName)
    await expect(incomingRow).toContainText('Wear history not included')

    // ── 11. Accept the transfer (no confirmation dialog — fires immediately) ──
    await incomingRow.getByRole('button', { name: /accept/i }).click()

    // Toast: "Transfer accepted"
    await expect(page.getByText('Transfer accepted')).toBeVisible()

    // Row is no longer in the pending list
    await expect(
      page
        .getByTestId('incoming-transfers')
        .locator('[data-testid^="transfer-row-"]')
        .filter({ hasText: itemName })
    ).not.toBeVisible()

    // ── 12. Recipient's /items — item appears; no wear history; location unset ──
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const recipientCard = page
      .getByTestId('item-card')
      .filter({ hasText: itemName })
      .first()
    await expect(recipientCard).toBeVisible()

    // Navigate to item detail to verify wear count and location
    await recipientCard.locator('a[href^="/items/"]').first().click()
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    // Wear count is 0 (history was not transferred)
    await expect(page.getByTestId('wear-count')).toHaveText('0')

    // Location breadcrumb is absent (location was cleared on transfer)
    await expect(page.getByTestId('location-breadcrumb')).not.toBeVisible()

    // ── 13. Switch back to admin ──
    await switchUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // ── 14. Item is GONE from admin's /items ──
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    await expect(
      page.getByTestId('item-card').filter({ hasText: itemName })
    ).not.toBeVisible()

    // ── 15. Outgoing tab shows transfer as "accepted" with a decided date ──
    await page.goto('/transfers?tab=outgoing')
    await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

    const finalRow = page
      .getByTestId('outgoing-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: itemName })
      .first()

    await expect(finalRow).toBeVisible()
    await expect(finalRow).toContainText('accepted')
    await expect(finalRow).toContainText('Decided:')
  })

  test.afterEach(async ({ page }) => {
    await logout(page).catch(() => {
      // page may already be at /login if the test switched users mid-flow
    })
  })
})
