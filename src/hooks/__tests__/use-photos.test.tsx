import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockPhoto } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth'
import { useUploadPhoto, useDeletePhoto } from '@/hooks/use-photos'

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

// ─── useUploadPhoto ───────────────────────────────────────────────────────────

describe('useUploadPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUploadPhoto should call toast.error with Unknown error when error response body is not JSON', async () => {
    server.use(
      http.post('/api/items/:id/photos', () =>
        new HttpResponse('not json', { status: 500, headers: { 'Content-Type': 'text/plain' } })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Unknown error')
  })

  it('useUploadPhoto should call toast.error with Unknown error when response body has no error field', async () => {
    server.use(
      http.post('/api/items/:id/photos', () =>
        HttpResponse.json({}, { status: 400 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Unknown error')
  })

  it('useUploadPhoto should call toast.error when POST /items/:id/photos returns 413', async () => {
    server.use(
      http.post('/api/items/:id/photos', () =>
        HttpResponse.json({ error: 'File too large' }, { status: 413 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('File too large')
  })

  it('useUploadPhoto should call toast.error when POST /items/:id/photos returns 404 item not found', async () => {
    server.use(
      http.post('/api/items/:id/photos', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-missing',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not found')
  })

  it('useUploadPhoto should include Authorization header when access token is set', async () => {
    let capturedAuthHeader: string | null | undefined
    server.use(
      http.post('/api/items/:id/photos', ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization')
        return HttpResponse.json(
          mockPhoto({ id: 'photo-new-001', media_key: 'uploads/item-001/photo-new-001.jpg' }),
          { status: 201 }
        )
      })
    )
    useAuthStore.setState({ accessToken: 'test-token-abc' })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedAuthHeader).toBe('Bearer test-token-abc')
  })

  it('useUploadPhoto should omit Authorization header when no access token is set', async () => {
    let capturedAuthHeader: string | null | undefined
    server.use(
      http.post('/api/items/:id/photos', ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization')
        return HttpResponse.json(
          mockPhoto({ id: 'photo-new-001', media_key: 'uploads/item-001/photo-new-001.jpg' }),
          { status: 201 }
        )
      })
    )
    useAuthStore.setState({ accessToken: null })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedAuthHeader).toBeNull()
  })

  it('useUploadPhoto should call toast.success and invalidate item detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUploadPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(
      mockPhoto({ id: 'photo-new-001', media_key: 'uploads/item-001/photo-new-001.jpg' })
    )
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalledWith('Photo uploaded')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})

// ─── useDeletePhoto ───────────────────────────────────────────────────────────

describe('useDeletePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeletePhoto should call toast.error when DELETE /items/:id/photos/:key returns 404', async () => {
    server.use(
      http.delete('/api/items/:id/photos/:key', () =>
        HttpResponse.json({ error: 'Photo not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeletePhoto(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', key: 'uploads/item-001/photo-001.jpg' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Photo not found')
  })

  it('useDeletePhoto should call toast.success and invalidate item detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeletePhoto(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', key: 'uploads/item-001/photo-001.jpg' })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalledWith('Photo deleted')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })

  it('useDeletePhoto should URL-encode photo key containing path separators', async () => {
    let capturedUrl: string | undefined
    server.use(
      http.delete('/api/items/:id/photos/:key', ({ request }) => {
        capturedUrl = request.url
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeletePhoto(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', key: 'items/uuid-1/uuid-2/filename.jpg' })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl).toContain('items%2Fuuid-1%2Fuuid-2%2Ffilename.jpg')
  })
})
