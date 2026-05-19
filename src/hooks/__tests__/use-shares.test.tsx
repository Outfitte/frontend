import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockShare, mockShareView } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/lib/toast'
import {
  useOutgoingShares,
  useCreateShare,
  useRevokeShare,
} from '@/hooks/use-shares'

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

// ─── useCreateShare ───────────────────────────────────────────────────────────

describe('useCreateShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateShare should set isError and not show toast when POST /shares returns 409 (already exists)', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Share already exists' }, { status: 409 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateShare(), { wrapper })
    act(() => {
      result.current.mutate({
        recipient_id: 'user-002',
        target_type: 'item',
        target_id: 'item-001',
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('useCreateShare should set isError and not show toast when POST /shares returns 422 (cannot share with self)', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Cannot share with self' }, { status: 422 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateShare(), { wrapper })
    act(() => {
      result.current.mutate({
        recipient_id: 'user-001',
        target_type: 'item',
        target_id: 'item-001',
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('useCreateShare should show error toast when POST /shares returns 404 (target not found)', async () => {
    server.use(
      http.post('/api/shares', () =>
        HttpResponse.json({ error: 'Target not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateShare(), { wrapper })
    act(() => {
      result.current.mutate({
        recipient_id: 'user-002',
        target_type: 'item',
        target_id: 'item-missing',
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Target not found')
  })

  it('useCreateShare should call toast.success and invalidate shares.outgoing when POST /shares returns 201', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateShare(), { wrapper })
    act(() => {
      result.current.mutate({
        recipient_id: 'user-002',
        target_type: 'item',
        target_id: 'item-001',
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.shares.outgoing,
    })
  })

  it('useCreateShare should post recipient_id, target_type, target_id to POST /shares', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post('/api/shares', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          mockShare({
            id: 'share-new-001',
            recipient_id: 'user-002',
            target_type: 'outfit',
            target_id: 'outfit-001',
          }),
          { status: 201 }
        )
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateShare(), { wrapper })
    act(() => {
      result.current.mutate({
        recipient_id: 'user-002',
        target_type: 'outfit',
        target_id: 'outfit-001',
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({
      recipient_id: 'user-002',
      target_type: 'outfit',
      target_id: 'outfit-001',
    })
  })
})

// ─── useRevokeShare ───────────────────────────────────────────────────────────

describe('useRevokeShare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRevokeShare should show error toast when DELETE /shares/:id returns 404', async () => {
    server.use(
      http.delete('/api/shares/:id', () =>
        HttpResponse.json({ error: 'Share not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRevokeShare(), { wrapper })
    act(() => {
      result.current.mutate('share-missing')
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Share not found')
  })

  it('useRevokeShare should invalidate shares.outgoing when DELETE /shares/:id returns 404', async () => {
    server.use(
      http.delete('/api/shares/:id', () =>
        HttpResponse.json({ error: 'Share not found' }, { status: 404 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRevokeShare(), { wrapper })
    act(() => {
      result.current.mutate('share-missing')
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.shares.outgoing,
    })
  })

  it('useRevokeShare should call toast.success and invalidate shares.outgoing when DELETE /shares/:id returns 204', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRevokeShare(), { wrapper })
    act(() => {
      result.current.mutate('share-001')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.shares.outgoing,
    })
  })
})

// ─── useOutgoingShares ────────────────────────────────────────────────────────

describe('useOutgoingShares', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutgoingShares should set isError when GET /shares returns 500', async () => {
    server.use(
      http.get('/api/shares', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutgoingShares(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useOutgoingShares should reflect loading state then return ShareView[] when GET /shares succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutgoingShares(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockShareView({ id: 'share-001' }),
      mockShareView({
        id: 'share-002',
        target_type: 'outfit',
        target_id: 'outfit-001',
      }),
    ])
  })
})
