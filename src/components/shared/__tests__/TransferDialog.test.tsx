import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { TransferDialog } from '@/components/shared/TransferDialog'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const baseProps = {
  open: true,
  onClose: vi.fn(),
  itemId: 'item-001',
  itemName: 'Blue Denim Jacket',
}

describe('TransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TransferDialog should not render when open is false', () => {
    render(<TransferDialog {...baseProps} open={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('TransferDialog should render dialog with recipient picker and include wear history checkbox when open is true', async () => {
    render(<TransferDialog {...baseProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByTestId('user-list')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /include wear history/i })).toBeInTheDocument()
  })

  it('TransferDialog should show only other users excluding authenticated user in recipient list', async () => {
    render(<TransferDialog {...baseProps} />)

    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
  })

  it('TransferDialog should have include wear history checkbox unchecked by default', () => {
    render(<TransferDialog {...baseProps} />)

    expect(screen.getByRole('checkbox', { name: /include wear history/i })).not.toBeChecked()
  })

  it('TransferDialog should show validation error and not call mutate when submitting without selecting a recipient', async () => {
    const user = userEvent.setup()
    render(<TransferDialog {...baseProps} />)

    await user.click(screen.getByRole('button', { name: /transfer/i }))

    expect(screen.getByText('Please select a recipient')).toBeInTheDocument()
  })

  it('TransferDialog should call useCreateTransfer mutate with transfer_history false when checkbox is unchecked on submit', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/transfers', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            id: 'transfer-new-001',
            item_id: 'item-001',
            sender_id: 'user-001',
            recipient_id: 'user-002',
            status: 'pending',
            transfer_history: false,
            created_at: '2026-01-01T00:00:00Z',
            decided_at: null,
          },
          { status: 201 }
        )
      })
    )
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    await vi.waitFor(() => {
      expect(capturedBody).toEqual({
        item_id: 'item-001',
        recipient_id: 'user-002',
        transfer_history: false,
      })
    })
  })

  it('TransferDialog should call useCreateTransfer mutate with transfer_history true when checkbox is checked on submit', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/transfers', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            id: 'transfer-new-001',
            item_id: 'item-001',
            sender_id: 'user-001',
            recipient_id: 'user-002',
            status: 'pending',
            transfer_history: true,
            created_at: '2026-01-01T00:00:00Z',
            decided_at: null,
          },
          { status: 201 }
        )
      })
    )
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('checkbox', { name: /include wear history/i }))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    await vi.waitFor(() => {
      expect(capturedBody).toEqual({
        item_id: 'item-001',
        recipient_id: 'user-002',
        transfer_history: true,
      })
    })
  })

  it('TransferDialog should close dialog and not fire error toast on successful transfer', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TransferDialog {...baseProps} onClose={onClose} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('TransferDialog should surface error inline and keep dialog open and not toast when API returns 409', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Item already has a pending transfer' }, { status: 409 })
      )
    )
    const user = userEvent.setup()
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    expect(await screen.findByTestId('transfer-dialog-error')).toBeInTheDocument()
    expect(screen.getByTestId('transfer-dialog-error')).toHaveTextContent(
      'Item already has a pending transfer'
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('TransferDialog should surface error inline and keep dialog open and not toast when API returns 422', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Cannot transfer to self' }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    expect(await screen.findByTestId('transfer-dialog-error')).toBeInTheDocument()
    expect(screen.getByTestId('transfer-dialog-error')).toHaveTextContent('Cannot transfer to self')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('TransferDialog should call onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TransferDialog {...baseProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('TransferDialog should call onClose when dialog is dismissed via Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TransferDialog {...baseProps} onClose={onClose} />)

    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('TransferDialog should display explanatory copy for the wear history checkbox', () => {
    render(<TransferDialog {...baseProps} />)

    expect(screen.getByText(/history stays with you/i)).toBeInTheDocument()
    expect(screen.getByText(/history travels with the item/i)).toBeInTheDocument()
  })

  it('TransferDialog should show loading skeleton while users are fetching', async () => {
    server.use(
      http.get('/api/users', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json([
          { id: 'user-002', email: 'alice@example.com' },
        ])
      })
    )
    render(<TransferDialog {...baseProps} />)

    expect(screen.getByTestId('transfer-dialog-loading')).toBeInTheDocument()
    await screen.findByText('alice@example.com')
    expect(screen.queryByTestId('transfer-dialog-loading')).not.toBeInTheDocument()
  })

  it('TransferDialog should show empty message when all users are the authenticated user', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json([{ id: 'user-001', email: 'user@example.com' }])
      )
    )
    render(<TransferDialog {...baseProps} />)

    expect(await screen.findByTestId('transfer-dialog-empty')).toBeInTheDocument()
  })

  it('TransferDialog should show Transferring label and disable button while mutation is pending', async () => {
    server.use(
      http.post('/api/transfers', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json(
          {
            id: 'transfer-new-001',
            item_id: 'item-001',
            sender_id: 'user-001',
            recipient_id: 'user-002',
            status: 'pending',
            transfer_history: false,
            created_at: '2026-01-01T00:00:00Z',
            decided_at: null,
          },
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    expect(screen.getByRole('button', { name: 'Transferring…' })).toBeDisabled()
    await screen.findByRole('button', { name: 'Transfer' })
  })

  it('TransferDialog should not show inline error and keep dialog open for non-409-422 API errors', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )
    const user = userEvent.setup()
    render(<TransferDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: /transfer/i }))

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Internal server error')
    })
    expect(screen.queryByTestId('transfer-dialog-error')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
