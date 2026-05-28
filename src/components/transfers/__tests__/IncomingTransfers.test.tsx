import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItemTransferView, mockUserSummary, mockItem, mockPhoto } from '@/test/mocks/fixtures'
import { IncomingTransfers } from '@/components/transfers/IncomingTransfers'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderComponent() {
  return render(<IncomingTransfers />)
}

describe('IncomingTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Error cases first

  it('IncomingTransfers should show error toast and keep row when Accept fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/accept', () =>
        HttpResponse.json({ error: 'Accept failed' }, { status: 500 })
      )
    )
    renderComponent()
    const acceptBtn = await screen.findByRole('button', { name: /accept/i })
    await user.click(acceptBtn)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  })

  it('IncomingTransfers should show error toast and keep row when Reject fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/reject', () =>
        HttpResponse.json({ error: 'Reject failed' }, { status: 500 })
      )
    )
    renderComponent()
    const rejectBtn = await screen.findByRole('button', { name: /reject/i })
    await user.click(rejectBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm reject/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('IncomingTransfers should show error state when query fails', async () => {
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderComponent()
    expect(await screen.findByTestId('incoming-transfers-error')).toBeInTheDocument()
    expect(screen.getByText(/failed to load transfers/i)).toBeInTheDocument()
  })

  it('IncomingTransfers should close AlertDialog and not fire POST when Cancel is clicked', async () => {
    const user = userEvent.setup()
    let rejectCalled = false
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/reject', () => {
        rejectCalled = true
        return HttpResponse.json(mockItemTransferView({ id: 'transfer-002', status: 'rejected' }))
      })
    )
    renderComponent()
    const rejectBtn = await screen.findByRole('button', { name: /reject/i })
    await user.click(rejectBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect(rejectCalled).toBe(false)
  })

  // Happy path

  it('IncomingTransfers should show loading skeleton while fetching', () => {
    server.use(
      http.get('/api/transfers/incoming', async () => {
        await new Promise(() => {})
      })
    )
    renderComponent()
    expect(screen.getByTestId('incoming-transfers-skeleton')).toBeInTheDocument()
  })

  it('IncomingTransfers should show empty state when there are no incoming transfers', async () => {
    server.use(
      http.get('/api/transfers/incoming', () => HttpResponse.json([]))
    )
    renderComponent()
    expect(await screen.findByText('No incoming transfers')).toBeInTheDocument()
  })

  it('IncomingTransfers should show item name, sender email, created date, and history flag per row', async () => {
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            item: mockItem({ id: 'item-001', name: 'Blue Denim Jacket', photos: [mockPhoto({ media_key: 'uploads/photo-001.jpg' })] }),
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
            created_at: '2026-03-15T00:00:00Z',
            transfer_history: true,
          }),
        ])
      )
    )
    renderComponent()
    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument()
    expect(screen.getByText(/wear history included/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Blue Denim Jacket' })).toHaveAttribute(
      'src',
      '/media/uploads/photo-001.jpg'
    )
  })

  it('IncomingTransfers should not show Accept or Reject buttons for non-pending transfers', async () => {
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-010',
            status: 'accepted',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByTestId('transfer-row-transfer-010')
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })

  it('IncomingTransfers should fire POST /transfers/:id/accept, show success toast when Accept is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      )
    )
    renderComponent()
    const acceptBtn = await screen.findByRole('button', { name: /accept/i })
    await user.click(acceptBtn)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Transfer accepted'))
  })

  it('IncomingTransfers should open AlertDialog when Reject is clicked without firing POST', async () => {
    const user = userEvent.setup()
    let rejectCalled = false
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      ),
      http.post('/api/transfers/:id/reject', () => {
        rejectCalled = true
        return HttpResponse.json(mockItemTransferView({ id: 'transfer-002', status: 'rejected' }))
      })
    )
    renderComponent()
    const rejectBtn = await screen.findByRole('button', { name: /reject/i })
    await user.click(rejectBtn)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(rejectCalled).toBe(false)
  })

  it('IncomingTransfers should fire POST /transfers/:id/reject and show success toast when Confirm reject is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      )
    )
    renderComponent()
    const rejectBtn = await screen.findByRole('button', { name: /reject/i })
    await user.click(rejectBtn)
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm reject/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Transfer rejected'))
  })

  it('IncomingTransfers should render placeholder div when item has no photos', async () => {
    server.use(
      http.get('/api/transfers/incoming', () =>
        HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            item: mockItem({ id: 'item-001', name: 'Blue Denim Jacket', photos: [] }),
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      )
    )
    renderComponent()
    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('transfer-row-transfer-002').querySelector('.bg-muted')).toBeInTheDocument()
  })

  it('IncomingTransfers should trigger a refetch when Refresh button is clicked', async () => {
    const user = userEvent.setup()
    let fetchCount = 0
    server.use(
      http.get('/api/transfers/incoming', () => {
        fetchCount++
        return HttpResponse.json([
          mockItemTransferView({
            id: 'transfer-002',
            status: 'pending',
            sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
          }),
        ])
      })
    )
    renderComponent()
    await screen.findByTestId('incoming-transfers')
    const initialCount = fetchCount
    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshBtn)
    await waitFor(() => expect(fetchCount).toBeGreaterThan(initialCount))
  })
})
