import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockItemTransferView } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { usePendingTransferItemIds, useIsItemLocked } from '@/hooks/use-pending-transfers'

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

// ─── usePendingTransferItemIds ───────────────────────────────────────────────

describe('usePendingTransferItemIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('usePendingTransferItemIds should return empty Set and isLoading true while query is loading', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePendingTransferItemIds(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.ids).toEqual(new Set())
  })

  it('usePendingTransferItemIds should return Set of item_ids for pending outgoing transfers when query succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePendingTransferItemIds(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.ids).toEqual(new Set(['item-001']))
  })

  it('usePendingTransferItemIds should exclude item_ids for non-pending transfers (accepted/rejected/cancelled)', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({ id: 'transfer-001', item_id: 'item-001', status: 'pending' }),
          mockItemTransferView({ id: 'transfer-002', item_id: 'item-002', status: 'accepted' }),
          mockItemTransferView({ id: 'transfer-003', item_id: 'item-003', status: 'rejected' }),
          mockItemTransferView({ id: 'transfer-004', item_id: 'item-004', status: 'cancelled' }),
        ])
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePendingTransferItemIds(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.ids).toEqual(new Set(['item-001']))
    expect(result.current.ids.has('item-002')).toBe(false)
    expect(result.current.ids.has('item-003')).toBe(false)
    expect(result.current.ids.has('item-004')).toBe(false)
  })

  it('usePendingTransferItemIds should return empty Set when there are no outgoing transfers', async () => {
    server.use(
      http.get('/api/transfers/outgoing', () => HttpResponse.json([]))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePendingTransferItemIds(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.ids).toEqual(new Set())
  })
})

// ─── useIsItemLocked ─────────────────────────────────────────────────────────

describe('useIsItemLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useIsItemLocked should return false when itemId is undefined', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useIsItemLocked(undefined), { wrapper })
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('useIsItemLocked should return true when itemId is in the pending set', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useIsItemLocked('item-001'), { wrapper })
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('useIsItemLocked should return false when itemId is not in the pending set', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useIsItemLocked('item-999'), { wrapper })
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('useIsItemLocked should flip from true to false when transfer is cancelled and query data changes', async () => {
    const { queryClient, wrapper } = makeWrapper()

    const { result } = renderHook(() => useIsItemLocked('item-001'), { wrapper })
    await waitFor(() => expect(result.current).toBe(true))

    server.use(
      http.get('/api/transfers/outgoing', () =>
        HttpResponse.json([
          mockItemTransferView({ id: 'transfer-001', item_id: 'item-001', status: 'cancelled' }),
        ])
      )
    )
    await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.outgoing })
    await waitFor(() => expect(result.current).toBe(false))
  })
})
