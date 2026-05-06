import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockPhoto } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { useUploadOutfitPhoto, useDeleteOutfitPhoto } from '@/hooks/use-outfit-photos'

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

// ─── useDeleteOutfitPhoto ─────────────────────────────────────────────────────

describe('useDeleteOutfitPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteOutfitPhoto should call toast.error when DELETE /outfits/:id/photos/:key returns 404 photo not found', async () => {
    server.use(
      http.delete('/api/outfits/:id/photos/:key', () =>
        HttpResponse.json({ error: 'Photo not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({ outfitId: 'outfit-001', mediaKey: 'uploads/outfit-001/photo-001.jpg' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Photo not found')
  })

  it('useDeleteOutfitPhoto should invalidate outfit detail when delete fails', async () => {
    server.use(
      http.delete('/api/outfits/:id/photos/:key', () =>
        HttpResponse.json({ error: 'Photo not found' }, { status: 404 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({ outfitId: 'outfit-001', mediaKey: 'uploads/outfit-001/photo-001.jpg' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })

  it('useDeleteOutfitPhoto should call toast.success and invalidate outfit detail when DELETE /outfits/:id/photos/:key returns 204', async () => {
    server.use(
      http.delete('/api/outfits/:id/photos/:key', () =>
        new HttpResponse(null, { status: 204 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({ outfitId: 'outfit-001', mediaKey: 'uploads/outfit-001/photo-001.jpg' })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalledWith('Photo deleted')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })
})

// ─── useUploadOutfitPhoto ─────────────────────────────────────────────────────

describe('useUploadOutfitPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUploadOutfitPhoto should call toast.error when POST /outfits/:id/photos returns 413 file too large', async () => {
    server.use(
      http.post('/api/outfits/:id/photos', () =>
        HttpResponse.json({ error: 'File too large' }, { status: 413 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('File too large')
  })

  it('useUploadOutfitPhoto should invalidate outfit detail when upload fails', async () => {
    server.use(
      http.post('/api/outfits/:id/photos', () =>
        HttpResponse.json({ error: 'File too large' }, { status: 413 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUploadOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })

  it('useUploadOutfitPhoto should return new Photo, call toast.success, and invalidate outfit detail when POST /outfits/:id/photos returns 201', async () => {
    server.use(
      http.post('/api/outfits/:id/photos', ({ params }) =>
        HttpResponse.json(
          mockPhoto({ id: 'photo-new-001', media_key: `uploads/${params['id'] as string}/photo-new-001.jpg` }),
          { status: 201 }
        )
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUploadOutfitPhoto(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        photo: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(
      mockPhoto({ id: 'photo-new-001', media_key: 'uploads/outfit-001/photo-new-001.jpg' })
    )
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalledWith('Photo uploaded')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })
})
