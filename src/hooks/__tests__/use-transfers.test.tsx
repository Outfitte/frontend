import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockItemTransferView } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/lib/toast'
import {
  useOutgoingTransfers,
  useIncomingTransfers,
  useCreateTransfer,
  useAcceptTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from '@/hooks/use-transfers'

vi.mock('@/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

// ─── useOutgoingTransfers ────────────────────────────────────────────────────

describe('useOutgoingTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutgoingTransfers should set isError when GET /transfers/outgoing returns 500', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        new HttpResponse(null, { status: 500 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutgoingTransfers(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useOutgoingTransfers should reflect loading state then return ItemTransferView[] when GET /transfers/outgoing succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutgoingTransfers(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockItemTransferView({ id: 'transfer-001' }),
    ])
  })

})

// ─── useIncomingTransfers ────────────────────────────────────────────────────

describe('useIncomingTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useIncomingTransfers should set isError when GET /transfers/incoming returns 500', async () => {
    server.use(
      http.get('/api/transfers/incoming', () =>
        new HttpResponse(null, { status: 500 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useIncomingTransfers(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useIncomingTransfers should reflect loading state then return ItemTransferView[] when GET /transfers/incoming succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useIncomingTransfers(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockItemTransferView({
        id: 'transfer-002',
        sender_id: 'user-002',
        sender: expect.objectContaining({ id: 'user-002', email: 'alice@example.com' }),
        recipient_id: 'user-001',
        recipient: expect.objectContaining({ id: 'user-001' }),
      }),
    ])
  })

})

// ─── useCreateTransfer ───────────────────────────────────────────────────────

describe('useCreateTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateTransfer should set isError and not show toast when POST /transfers returns 409 (already pending)', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Transfer already pending' }, { status: 409 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => {
      result.current.mutate({ item_id: 'item-001', recipient_id: 'user-002', transfer_history: false })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('useCreateTransfer should set isError and not show toast when POST /transfers returns 422 (self-transfer or inactive)', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Cannot transfer to self' }, { status: 422 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => {
      result.current.mutate({ item_id: 'item-001', recipient_id: 'user-001', transfer_history: false })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('useCreateTransfer should show error toast when POST /transfers returns 404', async () => {
    server.use(
      http.post('/api/transfers', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => {
      result.current.mutate({ item_id: 'item-missing', recipient_id: 'user-002', transfer_history: false })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Item not found')
  })

  it('useCreateTransfer should call toast.success and invalidate transfers.outgoing and items.all when POST /transfers succeeds', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => {
      result.current.mutate({ item_id: 'item-001', recipient_id: 'user-002', transfer_history: true })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Transfer sent')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transfers.outgoing })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
  })

  it('useCreateTransfer should post item_id, recipient_id, transfer_history to POST /transfers', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post('/api/transfers', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          mockItemTransferView({
            id: 'transfer-new-001',
            item_id: 'item-001',
            recipient_id: 'user-002',
            transfer_history: true,
          }),
          { status: 201 }
        )
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => {
      result.current.mutate({ item_id: 'item-001', recipient_id: 'user-002', transfer_history: true })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({
      item_id: 'item-001',
      recipient_id: 'user-002',
      transfer_history: true,
    })
  })
})

// ─── useAcceptTransfer ───────────────────────────────────────────────────────

describe('useAcceptTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useAcceptTransfer should show error toast when POST /transfers/:id/accept returns 404', async () => {
    server.use(
      http.post('/api/transfers/:id/accept', () =>
        HttpResponse.json({ error: 'Transfer not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAcceptTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-missing')
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Transfer not found')
  })

  it('useAcceptTransfer should call toast.success and invalidate transfers.incoming, transfers.outgoing, items.all when POST /transfers/:id/accept succeeds', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAcceptTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-001')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Transfer accepted')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transfers.incoming })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transfers.outgoing })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
  })
})

// ─── useRejectTransfer ───────────────────────────────────────────────────────

describe('useRejectTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRejectTransfer should show error toast when POST /transfers/:id/reject returns 404', async () => {
    server.use(
      http.post('/api/transfers/:id/reject', () =>
        HttpResponse.json({ error: 'Transfer not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRejectTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-missing')
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Transfer not found')
  })

  it('useRejectTransfer should call toast.success and invalidate transfers.incoming when POST /transfers/:id/reject succeeds', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRejectTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-001')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Transfer rejected')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transfers.incoming })
  })
})

// ─── useCancelTransfer ───────────────────────────────────────────────────────

describe('useCancelTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCancelTransfer should show error toast when POST /transfers/:id/cancel returns 404', async () => {
    server.use(
      http.post('/api/transfers/:id/cancel', () =>
        HttpResponse.json({ error: 'Transfer not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCancelTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-missing')
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Transfer not found')
  })

  it('useCancelTransfer should call toast.success and invalidate transfers.outgoing and items.all when POST /transfers/:id/cancel succeeds', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCancelTransfer(), { wrapper })
    act(() => {
      result.current.mutate('transfer-001')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Transfer cancelled')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.transfers.outgoing })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
  })
})
