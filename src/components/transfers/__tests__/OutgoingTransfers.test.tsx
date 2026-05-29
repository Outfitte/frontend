import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockItemTransferView,
  mockUserSummary,
  mockItem,
  mockPhoto,
} from '@/test/mocks/fixtures'
import { OutgoingTransfers } from '@/components/transfers/OutgoingTransfers'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderComponent() {
  return render(<OutgoingTransfers />)
}

describe('OutgoingTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Error cases first

  it('OutgoingTransfers should show error toast and leave row pending when Cancel fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/cancel', () =>
        HttpResponse.json({ error: 'Cancel failed' }, { status: 500 })
      )
    )
    renderComponent()
    const cancelBtn = await screen.findByRole('button', {
      name: /cancel transfer/i,
    })
    await user.click(cancelBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(
      screen.getByRole('button', { name: /cancel transfer/i })
    ).toBeInTheDocument()
  })

  it('OutgoingTransfers should show error state when query fails', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderComponent()
    expect(
      await screen.findByTestId('outgoing-transfers-error')
    ).toBeInTheDocument()
    expect(screen.getByText(/failed to load transfers/i)).toBeInTheDocument()
  })

  it('OutgoingTransfers should retry fetch when Retry button is clicked in error state', async () => {
    const user = userEvent.setup()
    let callCount = 0
    server.use(
      http.get('/api/transfers/outgoing', () => {
        callCount++
        if (callCount === 1) {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 })
        }
        return HttpResponse.json([])
      })
    )
    renderComponent()
    await screen.findByTestId('outgoing-transfers-error')
    await user.click(screen.getByRole('button', { name: /retry/i }))
    await screen.findByTestId('outgoing-transfers-empty')
    expect(callCount).toBeGreaterThan(1)
  })

  it('OutgoingTransfers should close AlertDialog and not fire POST when Keep transfer is clicked', async () => {
    const user = userEvent.setup()
    let cancelCalled = false
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/cancel', () => {
        cancelCalled = true
        return HttpResponse.json(
          mockItemTransferView({ id: 'transfer-001', status: 'cancelled' })
        )
      })
    )
    renderComponent()
    const cancelBtn = await screen.findByRole('button', {
      name: /cancel transfer/i,
    })
    await user.click(cancelBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /keep transfer/i }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect(cancelCalled).toBe(false)
  })

  // Happy path

  it('OutgoingTransfers should show loading skeleton while fetching', () => {
    server.use(
      http.get('/api/transfers/outgoing', async () => {
        await new Promise(() => {})
      })
    )
    renderComponent()
    expect(
      screen.getByTestId('outgoing-transfers-skeleton')
    ).toBeInTheDocument()
  })

  it('OutgoingTransfers should show empty state when there are no outgoing transfers', async () => {
    server.use(http.get('/api/transfers/outgoing', () => HttpResponse.json([])))
    renderComponent()
    expect(
      await screen.findByText("You haven't started any transfers")
    ).toBeInTheDocument()
  })

  it('OutgoingTransfers should show item name, recipient email, status badge, and created date per row', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            item: mockItem({
              id: 'item-001',
              name: 'Blue Denim Jacket',
              photos: [mockPhoto({ media_key: 'uploads/photo-001.jpg' })],
            }),
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
            created_at: '2026-03-15T00:00:00Z',
          }),
        ])
      )
    )
    renderComponent()
    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
    expect(screen.getByText('Sent: Mar 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Blue Denim Jacket' })
    ).toHaveAttribute('src', '/media/uploads/photo-001.jpg')
  })

  it('OutgoingTransfers should show decided_at date when present', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'accepted',
            decided_at: '2026-04-01T00:00:00Z',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByTestId('transfer-row-transfer-001')
    expect(screen.getByText('Decided: Apr 1, 2026')).toBeInTheDocument()
  })

  it('OutgoingTransfers should not show Cancel transfer button for non-pending transfers', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-010',
            status: 'accepted',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByTestId('transfer-row-transfer-010')
    expect(
      screen.queryByRole('button', { name: /cancel transfer/i })
    ).not.toBeInTheDocument()
  })

  it('OutgoingTransfers should show Cancel transfer button only for pending transfers', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    expect(
      await screen.findByRole('button', { name: /cancel transfer/i })
    ).toBeInTheDocument()
  })

  it('OutgoingTransfers should open AlertDialog when Cancel transfer is clicked without firing POST', async () => {
    const user = userEvent.setup()
    let cancelCalled = false
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/cancel', () => {
        cancelCalled = true
        return HttpResponse.json(
          mockItemTransferView({ id: 'transfer-001', status: 'cancelled' })
        )
      })
    )
    renderComponent()
    const cancelBtn = await screen.findByRole('button', {
      name: /cancel transfer/i,
    })
    await user.click(cancelBtn)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(cancelCalled).toBe(false)
  })

  it('OutgoingTransfers should fire POST /transfers/:id/cancel and show success toast when Confirm cancel is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    const cancelBtn = await screen.findByRole('button', {
      name: /cancel transfer/i,
    })
    await user.click(cancelBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Transfer cancelled')
    )
  })

  it('OutgoingTransfers should show placeholder div when item has no photos', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            item: mockItem({
              id: 'item-001',
              name: 'Blue Denim Jacket',
              photos: [],
            }),
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('photo-placeholder')).toBeInTheDocument()
  })

  it('OutgoingTransfers should render status badges with correct text for all statuses', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
          mockItemTransferView({
            id: 'transfer-002',
            status: 'accepted',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
          mockItemTransferView({
            id: 'transfer-003',
            status: 'rejected',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
          mockItemTransferView({
            id: 'transfer-004',
            status: 'cancelled',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByTestId('transfer-row-transfer-001')
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
    expect(screen.getByText('cancelled')).toBeInTheDocument()
  })

  it('OutgoingTransfers should trigger a refetch when Refresh button is clicked', async () => {
    const user = userEvent.setup()
    let fetchCount = 0
    server.use(
      http.get('/api/transfers/outgoing', () => {
        fetchCount++
        return HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-001',
            status: 'pending',
            recipient: mockUserSummary({
              id: 'user-002',
              email: 'alice@example.com',
            }),
          }),
        ])
      })
    )
    renderComponent()
    await screen.findByTestId('outgoing-transfers')
    const initialCount = fetchCount
    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshBtn)
    await waitFor(() => expect(fetchCount).toBeGreaterThan(initialCount))
  })
})
