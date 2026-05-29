import { type Locator, type Page, test, expect } from '@playwright/test'
import {
  switchUser,
  logout,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  RECIPIENT_EMAIL,
  RECIPIENT_PASSWORD,
} from '../helpers'

/**
 * Transfer: history-included acceptance, reject flow, cancel flow, and validation.
 *
 * Preconditions (satisfied by admin.setup.ts + recipient.setup.ts):
 *   - Admin has at least one active item with a wear log
 *   - Recipient user exists
 *
 * Covered (failure/error cases first):
 *   A. Validation — submit without recipient → inline error; dialog stays open
 *   B. Proactive gate — "Item options" hidden (no "Transfer…") when item is locked
 *   C. Backstop 409 — stale dialog submit shows inline error (data-testid="transfer-dialog-error"); dialog stays open
 *   D. Transfer WITH history (accepted) — recipient sees "Wear history included";
 *      item detail shows 2 wear logs after acceptance
 *   E. Reject flow — recipient rejects; item unlocked; admin outgoing shows "rejected"
 *   F. Cancel flow — admin cancels; item unlocked; outgoing shows "cancelled";
 *      recipient Incoming tab no longer offers Accept/Reject
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

/** Open the Transfer dialog and submit to RECIPIENT_EMAIL. */
async function initiateTransferViaUI(
  page: Page,
  card: Locator,
  itemName: string,
  includeHistory = false
): Promise<void> {
  await card.getByRole('button', { name: 'Item options' }).click()
  await expect(page.getByRole('menuitem', { name: 'Transfer…' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Transfer…' }).click()

  const dialog = page.getByRole('dialog', { name: `Transfer ${itemName}` })
  await expect(dialog).toBeVisible()

  if (includeHistory) {
    const historyCheckbox = dialog.locator('#transfer-history')
    await expect(historyCheckbox).not.toBeChecked()
    await historyCheckbox.click()
    await expect(historyCheckbox).toBeChecked()
  }

  await expect(dialog.getByText(RECIPIENT_EMAIL)).toBeVisible()
  await dialog.getByText(RECIPIENT_EMAIL).click()
  await dialog.getByRole('button', { name: 'Transfer' }).click()

  await expect(page.getByText('Transfer sent')).toBeVisible()
  await expect(dialog).not.toBeVisible()
}

/**
 * Cancel a pending outgoing transfer from the Outgoing tab.
 * Waits for the row's status badge to update to "cancelled".
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
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Confirm cancel' })
    .click()

  await expect(row.getByText('cancelled')).toBeVisible()
}

/**
 * Ensure an item has at least 2 wear logs; adds logs via API if fewer exist.
 * Uses past dates to avoid future-date validation errors.
 */
async function ensureItemHas2WearLogs(
  page: Page,
  itemId: string
): Promise<void> {
  const logsRes = await page.request.get(`/api/items/${itemId}/wear-logs`)
  expect(logsRes.ok()).toBeTruthy()
  const logs: unknown[] = await logsRes.json()

  for (let i = logs.length; i < 2; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i - 1) // yesterday, day-before, …
    const addRes = await page.request.post(`/api/items/${itemId}/wear-logs`, {
      data: { worn_on: date.toISOString().split('T')[0] },
    })
    expect(addRes.ok()).toBeTruthy()
  }
}

// ── test suite ────────────────────────────────────────────────────────────────

test.describe('Transfer history, reject, and cancel flows', () => {
  let pendingTransferId: string | null = null

  test.afterEach(async ({ page }) => {
    if (pendingTransferId) {
      await page.request
        .post(`/api/transfers/${pendingTransferId}/cancel`)
        .catch(() => {})
      pendingTransferId = null
    }
    await logout(page).catch(() => {})
  })

  // ── A. Validation ─────────────────────────────────────────────────────────

  test('Transfer dialog should show inline validation error and remain open when submitted without a recipient', async ({
    page,
  }) => {
    const { card, name } = await findFirstUnlockedItem(page)

    await card.getByRole('button', { name: 'Item options' }).click()
    await expect(
      page.getByRole('menuitem', { name: 'Transfer…' })
    ).toBeVisible()
    await page.getByRole('menuitem', { name: 'Transfer…' }).click()

    const dialog = page.getByRole('dialog', { name: `Transfer ${name}` })
    await expect(dialog).toBeVisible()

    // Submit without selecting a recipient
    await dialog.getByRole('button', { name: 'Transfer' }).click()

    // Inline validation error is shown; dialog stays open
    await expect(dialog.getByText('Please select a recipient')).toBeVisible()
    await expect(dialog).toBeVisible()

    // Dismiss without creating a transfer
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()
  })

  // ── B. Proactive gate ─────────────────────────────────────────────────────

  test('"Item options" button should be hidden when item has a pending transfer (proactive — Transfer… not accessible)', async ({
    page,
  }) => {
    const { id, name } = await findFirstUnlockedItem(page)

    // Lock via API to bypass the React Query cache
    const usersRes = await page.request.get('/api/users')
    const users: Array<{ id: string; email: string }> = await usersRes.json()
    const recipient = users.find((u) => u.email === RECIPIENT_EMAIL)
    expect(recipient).toBeDefined()

    const transferRes = await page.request.post('/api/transfers', {
      data: {
        item_id: id,
        recipient_id: recipient!.id,
        transfer_history: false,
      },
    })
    expect(transferRes.ok()).toBeTruthy()
    const transfer: { id: string } = await transferRes.json()
    pendingTransferId = transfer.id

    // Navigate to items page so the UI reflects the lock
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const lockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(lockedCard).toBeVisible()

    // Context-menu trigger is hidden — "Transfer…" entry is not accessible
    await expect(
      lockedCard.getByRole('button', { name: 'Item options' })
    ).not.toBeVisible()

    // Restore the item for subsequent tests
    await cancelTransferViaUI(page, name)
    pendingTransferId = null
  })

  // ── C. Backstop 409 ───────────────────────────────────────────────────────

  test('Transfer dialog should show inline 409 error and remain open when item is locked after dialog was opened (stale cache)', async ({
    page,
  }) => {
    const { card, name, id } = await findFirstUnlockedItem(page)

    // Fetch recipient ID via API before opening the dialog
    const usersRes = await page.request.get('/api/users')
    const users: Array<{ id: string; email: string }> = await usersRes.json()
    const recipient = users.find((u) => u.email === RECIPIENT_EMAIL)
    expect(recipient).toBeDefined()

    // Open the Transfer dialog while the item is still unlocked
    await card.getByRole('button', { name: 'Item options' }).click()
    await expect(
      page.getByRole('menuitem', { name: 'Transfer…' })
    ).toBeVisible()
    await page.getByRole('menuitem', { name: 'Transfer…' }).click()

    const dialog = page.getByRole('dialog', { name: `Transfer ${name}` })
    await expect(dialog).toBeVisible()

    // Lock the item via API — UI cache is now stale; dialog does not know
    const transferRes = await page.request.post('/api/transfers', {
      data: {
        item_id: id,
        recipient_id: recipient!.id,
        transfer_history: false,
      },
    })
    expect(transferRes.ok()).toBeTruthy()
    const transfer: { id: string } = await transferRes.json()
    pendingTransferId = transfer.id

    // Select recipient and submit — backend returns 409 for locked item
    await expect(dialog.getByText(RECIPIENT_EMAIL)).toBeVisible()
    await dialog.getByText(RECIPIENT_EMAIL).click()
    await dialog.getByRole('button', { name: 'Transfer' }).click()

    // 409 → inline error shown inside dialog; dialog stays open
    await expect(page.getByTestId('transfer-dialog-error')).toBeVisible()
    await expect(dialog).toBeVisible()

    // Close dialog; pendingTransferId is cleaned up in afterEach
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()
  })

  // ── D. Transfer WITH history (accepted) ───────────────────────────────────

  test('admin should send transfer with wear history; recipient accepts; 2 wear logs are present on item detail', async ({
    page,
  }) => {
    const { card, name, id } = await findFirstUnlockedItem(page)

    // Ensure the item has at least 2 wear logs before transferring with history
    await ensureItemHas2WearLogs(page, id)

    // Open dialog, CHECK "Include wear history", select recipient, submit
    await initiateTransferViaUI(page, card, name, true)

    // Item card shows "Transfer pending" badge
    const lockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(lockedCard.getByTestId('item-locked-badge')).toBeVisible()

    // ── Switch to recipient ──
    await switchUser(page, RECIPIENT_EMAIL, RECIPIENT_PASSWORD)

    // ── Incoming tab: transfer is marked history-included ──
    await page.goto('/transfers')
    await expect(page.getByTestId('incoming-transfers')).toBeVisible()

    const incomingRow = page
      .getByTestId('incoming-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: name })
      .first()
    await expect(incomingRow).toBeVisible()
    await expect(incomingRow).toContainText('Wear history included')
    await expect(incomingRow).toContainText(ADMIN_EMAIL)

    // Accept the transfer
    await incomingRow.getByRole('button', { name: /accept/i }).click()
    await expect(page.getByText('Transfer accepted')).toBeVisible()

    // Row is no longer in the pending list
    await expect(
      page
        .getByTestId('incoming-transfers')
        .locator('[data-testid^="transfer-row-"]')
        .filter({ hasText: name })
    ).not.toBeVisible()

    // ── Recipient's item detail: 2 wear logs are present ──
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const recipientCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(recipientCard).toBeVisible()
    await recipientCard.locator('a[href^="/items/"]').first().click()
    await expect(page.getByTestId('item-detail-page')).toBeVisible()

    // Wear history was transferred: count shows 2
    await expect(page.getByTestId('wear-count')).toHaveText('2')

    // ── Switch back to admin ──
    await switchUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // Item is gone from admin's /items
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()
    await expect(
      page.getByTestId('item-card').filter({ hasText: name })
    ).not.toBeVisible()

    // Outgoing tab shows transfer as "accepted" with a decided date
    await page.goto('/transfers?tab=outgoing')
    await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

    const finalRow = page
      .getByTestId('outgoing-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: name })
      .first()
    await expect(finalRow).toBeVisible()
    await expect(finalRow).toContainText('accepted')
    await expect(finalRow).toContainText('Decided:')
  })

  // ── E. Reject flow ────────────────────────────────────────────────────────

  test('recipient reject should unlock the item for admin and show status "rejected" in outgoing tab', async ({
    page,
  }) => {
    const { card, name } = await findFirstUnlockedItem(page)

    await initiateTransferViaUI(page, card, name)

    // Capture transfer ID for afterEach cleanup
    const outRes = await page.request.get('/api/transfers/outgoing')
    const outgoing: Array<{ id: string; item: { name: string } }> =
      await outRes.json()
    const match = outgoing.find((t) => t.item.name === name)
    expect(match).toBeDefined()
    pendingTransferId = match!.id

    // ── Switch to recipient ──
    await switchUser(page, RECIPIENT_EMAIL, RECIPIENT_PASSWORD)

    await page.goto('/transfers')
    await expect(page.getByTestId('incoming-transfers')).toBeVisible()

    const incomingRow = page
      .getByTestId('incoming-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: name })
      .first()
    await expect(incomingRow).toBeVisible()

    // Reject the transfer via confirmation dialog
    await incomingRow.getByRole('button', { name: /reject/i }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Confirm reject' })
      .click()

    await expect(page.getByText('Transfer rejected')).toBeVisible()

    // Row no longer offers Accept/Reject after rejection
    await expect(
      page
        .getByTestId('incoming-transfers')
        .locator('[data-testid^="transfer-row-"]')
        .filter({ hasText: name })
        .getByRole('button', { name: /accept/i })
    ).not.toBeVisible()

    // ── Switch back to admin ──
    await switchUser(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // Item is unlocked in the grid: badge gone, context menu restored
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const unlockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(unlockedCard).toBeVisible()
    await expect(
      unlockedCard.getByTestId('item-locked-badge')
    ).not.toBeVisible()
    await expect(
      unlockedCard.getByRole('button', { name: 'Item options' })
    ).toBeVisible()

    // Outgoing tab: status "rejected" with a decided date
    await page.goto('/transfers?tab=outgoing')
    await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

    const rejectedRow = page
      .getByTestId('outgoing-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: name })
      .first()
    await expect(rejectedRow).toBeVisible()
    await expect(rejectedRow.getByText('rejected')).toBeVisible()
    await expect(rejectedRow).toContainText('Decided:')

    pendingTransferId = null
  })

  // ── F. Cancel flow ────────────────────────────────────────────────────────

  test('admin cancel should unlock the item, show "cancelled" status, and remove Accept/Reject from recipient incoming tab', async ({
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

    // Item shows pending badge and "Transfer pending" text in the grid
    const lockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(lockedCard.getByTestId('item-locked-badge')).toBeVisible()
    await expect(lockedCard.getByText('Transfer pending')).toBeVisible()

    // ── Admin cancels from Outgoing tab ──
    await page.goto('/transfers?tab=outgoing')
    await expect(page.getByTestId('outgoing-transfers')).toBeVisible()

    const outgoingRow = page
      .getByTestId('outgoing-transfers')
      .locator('[data-testid^="transfer-row-"]')
      .filter({ hasText: name })
      .first()
    await expect(outgoingRow).toBeVisible()
    await expect(outgoingRow.getByText('pending')).toBeVisible()

    await outgoingRow.getByRole('button', { name: 'Cancel transfer' }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Confirm cancel' })
      .click()

    await expect(page.getByText('Transfer cancelled')).toBeVisible()
    await expect(outgoingRow.getByText('cancelled')).toBeVisible()
    pendingTransferId = null

    // Item is unlocked in the grid: badge gone, context menu restored
    await page.goto('/items')
    await expect(page.getByTestId('items-page')).toBeVisible()

    const unlockedCard = page
      .getByTestId('item-card')
      .filter({ hasText: name })
      .first()
    await expect(unlockedCard).toBeVisible()
    await expect(
      unlockedCard.getByTestId('item-locked-badge')
    ).not.toBeVisible()
    await expect(
      unlockedCard.getByRole('button', { name: 'Item options' })
    ).toBeVisible()
    await expect(
      unlockedCard.getByRole('button', { name: 'Wore today' })
    ).toBeVisible()

    // Item detail: pending banner is gone
    await page.goto(`/items/${id}`)
    await expect(page.getByTestId('item-detail-page')).toBeVisible()
    await expect(page.getByTestId('item-transfer-banner')).not.toBeVisible()

    // ── Switch to recipient ──
    await switchUser(page, RECIPIENT_EMAIL, RECIPIENT_PASSWORD)

    await page.goto('/transfers')
    await page.waitForLoadState('networkidle')

    // Cancelled transfer no longer offers Accept/Reject
    await expect(
      page
        .locator('[data-testid^="transfer-row-"]')
        .filter({ hasText: name })
        .getByRole('button', { name: /accept/i })
    ).not.toBeVisible()
  })
})
