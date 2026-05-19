import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockShareView,
  mockItem,
  mockOutfit,
  mockLocation,
} from '@/test/mocks/fixtures'
import { OutgoingSharesPage } from '@/pages/OutgoingSharesPage'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage() {
  return render(<OutgoingSharesPage />)
}

describe('OutgoingSharesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('OutgoingSharesPage should show loading skeleton while shares are fetching', () => {
    server.use(
      http.get('/api/shares', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()
    expect(screen.getByTestId('outgoing-shares-skeleton')).toBeInTheDocument()
  })

  it('OutgoingSharesPage should show error message when shares query fails', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()
    expect(
      await screen.findByText(/failed to load shares/i)
    ).toBeInTheDocument()
  })

  it('OutgoingSharesPage should stay on page and show error toast when revoke fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'item',
            target_id: 'item-001',
          }),
        ])
      ),
      http.delete('/api/shares/:id', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()
    const revokeButtons = await screen.findAllByRole('button', {
      name: /revoke/i,
    })
    await user.click(revokeButtons[0])
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }))
    expect(
      await screen.findByTestId('outgoing-shares-page')
    ).toBeInTheDocument()
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('OutgoingSharesPage should show empty state when no shares exist', async () => {
    server.use(http.get('/api/shares', () => HttpResponse.json([])))
    renderPage()
    expect(
      await screen.findByText("You haven't shared anything yet")
    ).toBeInTheDocument()
  })

  it('OutgoingSharesPage should have data-testid on root element when shares are loaded', async () => {
    renderPage()
    expect(
      await screen.findByTestId('outgoing-shares-page')
    ).toBeInTheDocument()
  })

  it('OutgoingSharesPage should list shares grouped by target_type in Items and Outfits sections', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'item',
            target_id: 'item-001',
          }),
          mockShareView({
            id: 'share-002',
            target_type: 'outfit',
            target_id: 'outfit-001',
          }),
          mockShareView({
            id: 'share-003',
            target_type: 'location',
            target_id: 'loc-001',
          }),
        ])
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket' }),
        ])
      ),
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Casual Friday' }),
        ])
      ),
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet' }),
        ])
      )
    )
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Items' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outfits' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Locations' })
    ).toBeInTheDocument()
  })

  it('OutgoingSharesPage should show recipient email, resolved target name, and created_at for each row', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            recipient: { id: 'user-002', email: 'alice@example.com' },
            target_type: 'item',
            target_id: 'item-001',
            created_at: '2026-03-15T00:00:00Z',
          }),
        ])
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket' }),
        ])
      )
    )
    renderPage()
    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument()
  })

  it('OutgoingSharesPage should fall back to target_id when item target is not found in lookup', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'item',
            target_id: 'item-deleted',
          }),
        ])
      ),
      http.get('/api/items', () => HttpResponse.json([]))
    )
    renderPage()
    expect(await screen.findByText('item-deleted')).toBeInTheDocument()
  })

  it('OutgoingSharesPage should fall back to target_id when outfit target is not found in lookup', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'outfit',
            target_id: 'outfit-deleted',
          }),
        ])
      ),
      http.get('/api/outfits', () => HttpResponse.json([]))
    )
    renderPage()
    expect(await screen.findByText('outfit-deleted')).toBeInTheDocument()
  })

  it('OutgoingSharesPage should fall back to target_id when location target is not found in lookup', async () => {
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'location',
            target_id: 'loc-deleted',
          }),
        ])
      ),
      http.get('/api/locations', () => HttpResponse.json([]))
    )
    renderPage()
    expect(await screen.findByText('loc-deleted')).toBeInTheDocument()
  })

  it('OutgoingSharesPage should open AlertDialog when Revoke button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    const revokeButtons = await screen.findAllByRole('button', {
      name: /revoke/i,
    })
    await user.click(revokeButtons[0])
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/revoke share/i)).toBeInTheDocument()
  })

  it('OutgoingSharesPage should call revokeShare and close dialog when Confirm revoke is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/shares', () =>
        HttpResponse.json([
          mockShareView({
            id: 'share-001',
            target_type: 'item',
            target_id: 'item-001',
          }),
        ])
      )
    )
    renderPage()
    const revokeButtons = await screen.findAllByRole('button', {
      name: /revoke/i,
    })
    await user.click(revokeButtons[0])
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect(toast.success).toHaveBeenCalled()
  })
})
