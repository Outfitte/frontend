import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { queryKeys } from '@/lib/query-keys'
import { useAddOutfitItem, useRemoveOutfitItem } from '@/hooks/use-outfit-items'

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

// ─── useAddOutfitItem ─────────────────────────────────────────────────────────

describe('useAddOutfitItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useAddOutfitItem should call toast.error when POST /outfits/:id/items returns 404', async () => {
    server.use(
      http.post('/api/outfits/:id/items', () =>
        HttpResponse.json({ error: 'Item not owned' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAddOutfitItem(), { wrapper })
    act(() => { result.current.mutate({ outfitId: 'outfit-001', itemId: 'item-001' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not owned')
  })

  it('useAddOutfitItem should post { item_id } to /outfits/:id/items and invalidate outfits cache on success', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post('/api/outfits/:id/items', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAddOutfitItem(), { wrapper })
    act(() => { result.current.mutate({ outfitId: 'outfit-001', itemId: 'item-002' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({ item_id: 'item-002' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })
})

// ─── useRemoveOutfitItem ──────────────────────────────────────────────────────

describe('useRemoveOutfitItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRemoveOutfitItem should call toast.error when DELETE /outfits/:id/items/:itemId returns 404', async () => {
    server.use(
      http.delete('/api/outfits/:id/items/:itemId', () =>
        HttpResponse.json({ error: 'Item not found in outfit' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRemoveOutfitItem(), { wrapper })
    act(() => { result.current.mutate({ outfitId: 'outfit-001', itemId: 'item-001' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not found in outfit')
  })

  it('useRemoveOutfitItem should delete /outfits/:id/items/:itemId and invalidate outfits cache on success', async () => {
    let capturedPath: string | undefined
    server.use(
      http.delete('/api/outfits/:id/items/:itemId', ({ params }) => {
        capturedPath = `/outfits/${params['id'] as string}/items/${params['itemId'] as string}`
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRemoveOutfitItem(), { wrapper })
    act(() => { result.current.mutate({ outfitId: 'outfit-001', itemId: 'item-002' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedPath).toBe('/outfits/outfit-001/items/item-002')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })
})
