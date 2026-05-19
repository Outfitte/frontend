import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { ShareDialog } from '@/components/shared/ShareDialog'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const baseProps = {
  open: true,
  onClose: vi.fn(),
  targetType: 'item' as const,
  targetId: 'item-001',
}

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ShareDialog should not render when open is false', () => {
    render(<ShareDialog {...baseProps} open={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ShareDialog should show validation error when submitting without selecting a recipient', async () => {
    const user = userEvent.setup()
    render(<ShareDialog {...baseProps} />)

    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(screen.getByText('Please select a recipient')).toBeInTheDocument()
  })

  it('ShareDialog should stay open show inline error and not toast when API returns 409', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Already shared' }, { status: 409 })
      )
    )
    const user = userEvent.setup()
    render(<ShareDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(await screen.findByText('Already shared')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('ShareDialog should stay open show inline error and not toast when API returns 422', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Cannot share with self' }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    render(<ShareDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(
      await screen.findByText('Cannot share with self')
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('ShareDialog should show toast error on failures other than 409 or 422', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )
    const user = userEvent.setup()
    render(<ShareDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Internal server error')
    })
  })

  it('ShareDialog should render dialog with title when open is true', () => {
    render(<ShareDialog {...baseProps} targetLabel="Blue Denim Jacket" />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Share Blue Denim Jacket')).toBeInTheDocument()
  })

  it('ShareDialog should show empty message when all users are the authenticated user', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json([{ id: 'user-001', email: 'user@example.com' }])
      )
    )
    render(<ShareDialog {...baseProps} />)

    expect(await screen.findByTestId('share-dialog-empty')).toBeInTheDocument()
  })

  it('ShareDialog should show loading skeleton while users are fetching', async () => {
    server.use(
      http.get('/api/users', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json([
          { id: 'user-002', email: 'alice@example.com' },
        ])
      })
    )
    render(<ShareDialog {...baseProps} />)

    expect(screen.getByTestId('share-dialog-loading')).toBeInTheDocument()
    await screen.findByText('alice@example.com')
    expect(screen.queryByTestId('share-dialog-loading')).not.toBeInTheDocument()
  })

  it('ShareDialog should render user list populated from useUsers excluding authenticated user', async () => {
    render(<ShareDialog {...baseProps} />)

    expect(await screen.findByText('alice@example.com')).toBeInTheDocument()
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
  })

  it('ShareDialog should show Sharing label and disable button while mutation is pending', async () => {
    server.use(
      http.post('/api/shares', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json(
          {
            id: 'share-new',
            recipient_id: 'user-002',
            target_type: 'item',
            target_id: 'item-001',
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    render(<ShareDialog {...baseProps} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(screen.getByRole('button', { name: 'Sharing…' })).toBeDisabled()
    await screen.findByRole('button', { name: 'Share' })
  })

  it('ShareDialog should call useCreateShare with recipient_id target_type and target_id on submit', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/shares', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            id: 'share-new',
            recipient_id: 'user-002',
            target_type: 'item',
            target_id: 'item-001',
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 }
        )
      })
    )
    render(<ShareDialog {...baseProps} targetType="item" targetId="item-001" />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    await vi.waitFor(() => {
      expect(capturedBody).toEqual({
        recipient_id: 'user-002',
        target_type: 'item',
        target_id: 'item-001',
      })
    })
  })

  it('ShareDialog should close dialog and show success toast on successful share', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShareDialog {...baseProps} onClose={onClose} />)

    await screen.findByText('alice@example.com')
    await user.click(screen.getByText('alice@example.com'))
    await user.click(screen.getByRole('button', { name: 'Share' }))

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    expect(toast.success).toHaveBeenCalledWith('Share created')
  })

  it('ShareDialog should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShareDialog {...baseProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('ShareDialog should call onClose when dialog is dismissed via Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShareDialog {...baseProps} onClose={onClose} />)

    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
