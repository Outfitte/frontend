import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockOutfit } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import {
  useOutfits,
  useOutfit,
  useCreateOutfit,
  useUpdateOutfit,
  useDeleteOutfit,
} from '@/hooks/use-outfits'

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

// ─── useOutfits ───────────────────────────────────────────────────────────────

describe('useOutfits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutfits should return error when GET /outfits returns 500', async () => {
    server.use(
      http.get('/api/outfits', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfits(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useOutfits should return Outfit[] when GET /outfits returns list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfits(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockOutfit({ id: 'outfit-001' }),
      mockOutfit({ id: 'outfit-002', name: 'Smart Casual' }),
    ])
  })

  it('useOutfits should pass from/to as query params when filter is provided', async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get('/api/outfits', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([mockOutfit({ id: 'outfit-001' })])
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfits({ from: '2026-01-01', to: '2026-01-31' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl).toContain('from=2026-01-01')
    expect(capturedUrl).toContain('to=2026-01-31')
  })
})

// ─── useOutfit ────────────────────────────────────────────────────────────────

describe('useOutfit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutfit should stay idle and not fetch when id is empty string', async () => {
    let requested = false
    server.use(
      http.get('/api/outfits/:id', () => {
        requested = true
        return HttpResponse.json(mockOutfit())
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfit(''), { wrapper })
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.fetchStatus).toBe('idle')
    expect(requested).toBe(false)
  })

  it('useOutfit should return 404 error when outfit not found', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Outfit not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfit('outfit-missing'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(404)
    expect(result.current.error?.message).toBe('Outfit not found')
  })

  it('useOutfit should return Outfit when GET /outfits/:id returns outfit', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfit('outfit-001'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockOutfit({ id: 'outfit-001' }))
  })
})

// ─── useCreateOutfit ──────────────────────────────────────────────────────────

describe('useCreateOutfit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateOutfit should call toast.error when POST /outfits returns 400', async () => {
    server.use(
      http.post('/api/outfits', () =>
        HttpResponse.json({ error: 'Validation failed' }, { status: 400 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateOutfit(), { wrapper })
    act(() => { result.current.mutate({ name: 'Test Outfit' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Validation failed')
  })

  it('useCreateOutfit should post name+notes and invalidate outfits.all on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateOutfit(), { wrapper })
    act(() => { result.current.mutate({ name: 'Casual Friday', notes: 'Weekend look' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(
      mockOutfit({ id: 'outfit-new-001', name: 'Casual Friday', notes: 'Weekend look' })
    )
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all })
  })
})

// ─── useUpdateOutfit ──────────────────────────────────────────────────────────

describe('useUpdateOutfit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUpdateOutfit should call toast.error when PATCH /outfits/:id returns 404', async () => {
    server.use(
      http.patch('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Outfit not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateOutfit(), { wrapper })
    act(() => { result.current.mutate({ id: 'outfit-missing', data: { name: 'Updated Name' } }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Outfit not found')
  })

  it('useUpdateOutfit should call toast.success and invalidate list and detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateOutfit(), { wrapper })
    act(() => { result.current.mutate({ id: 'outfit-001', data: { name: 'Updated Casual Friday' } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.detail('outfit-001') })
  })
})

// ─── useDeleteOutfit ──────────────────────────────────────────────────────────

describe('useDeleteOutfit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteOutfit should call toast.error when DELETE /outfits/:id returns 404', async () => {
    server.use(
      http.delete('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Outfit not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteOutfit(), { wrapper })
    act(() => { result.current.mutate('outfit-missing') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Outfit not found')
  })

  it('useDeleteOutfit should call toast.success and invalidate outfits list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteOutfit(), { wrapper })
    act(() => { result.current.mutate('outfit-001') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all })
  })
})
