import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockLocation, mockChildLocation } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/lib/toast'
import {
  useLocations,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useMoveLocation,
} from '@/hooks/use-locations'

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

// ─── useLocations ─────────────────────────────────────────────────────────────

describe('useLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useLocations should set isError when GET /locations returns 500', async () => {
    server.use(
      http.get('/api/locations', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLocations(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useLocations should return Location[] when GET /locations returns list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLocations(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockLocation({ id: 'loc-001' }),
      mockChildLocation({ id: 'loc-002' }),
    ])
  })
})

// ─── useLocation ──────────────────────────────────────────────────────────────

describe('useLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useLocation should set isError when GET /locations/:id returns 404', async () => {
    server.use(
      http.get('/api/locations/:id', () =>
        HttpResponse.json({ error: 'Location not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLocation('loc-missing'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(404)
    expect(result.current.error?.message).toBe('Location not found')
  })

  it('useLocation should return Location when GET /locations/:id returns location', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLocation('loc-001'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockLocation({ id: 'loc-001' }))
  })
})

// ─── useCreateLocation ────────────────────────────────────────────────────────

describe('useCreateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateLocation should call toast.error when POST /locations returns 400', async () => {
    server.use(
      http.post('/api/locations', () =>
        HttpResponse.json({ error: 'Validation failed' }, { status: 400 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateLocation(), { wrapper })
    act(() => { result.current.mutate({ label: 'Bedroom' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Validation failed')
  })

  it('useCreateLocation should call toast.success and invalidate locations list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateLocation(), { wrapper })
    act(() => { result.current.mutate({ label: 'Bedroom' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockLocation({ id: 'loc-new-001', label: 'Bedroom' }))
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.all })
  })

  it('useCreateLocation should send parent_id in body when creating a child location', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post('/api/locations', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json(
          mockLocation({ id: 'loc-new-001', label: 'Top Shelf', parent_id: 'loc-001' }),
          { status: 201 }
        )
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateLocation(), { wrapper })
    act(() => { result.current.mutate({ label: 'Top Shelf', parent_id: 'loc-001' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({ label: 'Top Shelf', parent_id: 'loc-001' })
  })
})

// ─── useUpdateLocation ────────────────────────────────────────────────────────

describe('useUpdateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUpdateLocation should call toast.error when PATCH /locations/:id returns 404', async () => {
    server.use(
      http.patch('/api/locations/:id', () =>
        HttpResponse.json({ error: 'Location not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'loc-missing', label: 'New Label' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Location not found')
  })

  it('useUpdateLocation should call toast.success and invalidate list and detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'loc-001', label: 'Updated Closet' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.detail('loc-001') })
  })
})

// ─── useDeleteLocation ────────────────────────────────────────────────────────

describe('useDeleteLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteLocation should call toast.error when DELETE /locations/:id returns 409 with children', async () => {
    server.use(
      http.delete('/api/locations/:id', () =>
        HttpResponse.json({ error: 'Location has children' }, { status: 409 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteLocation(), { wrapper })
    act(() => { result.current.mutate('loc-001') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(409)
    expect(toast.error).toHaveBeenCalledWith('Location has children')
  })

  it('useDeleteLocation should call toast.error when DELETE /locations/:id returns 409 with assigned items', async () => {
    server.use(
      http.delete('/api/locations/:id', () =>
        HttpResponse.json({ error: 'Location has assigned items' }, { status: 409 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteLocation(), { wrapper })
    act(() => { result.current.mutate('loc-001') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(409)
    expect(toast.error).toHaveBeenCalledWith('Location has assigned items')
  })

  it('useDeleteLocation should call toast.success and invalidate locations list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteLocation(), { wrapper })
    act(() => { result.current.mutate('loc-001') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.all })
  })
})

// ─── useMoveLocation ──────────────────────────────────────────────────────────

describe('useMoveLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useMoveLocation should call toast.error when PATCH /locations/:id/move returns 409 cycle', async () => {
    server.use(
      http.patch('/api/locations/:id/move', () =>
        HttpResponse.json({ error: 'Move would create a cycle' }, { status: 409 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMoveLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'loc-001', parent_id: 'loc-002' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(409)
    expect(toast.error).toHaveBeenCalledWith('Move would create a cycle')
  })

  it('useMoveLocation should call toast.success and invalidate locations list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useMoveLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'loc-002', parent_id: null }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockLocation({ id: 'loc-002', parent_id: null }))
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.locations.all })
  })

  it('useMoveLocation should send parent_id in body when PATCH /locations/:id/move', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.patch('/api/locations/:id/move', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json(mockLocation({ id: 'loc-002', parent_id: null }))
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMoveLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'loc-002', parent_id: null }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({ parent_id: null })
  })
})
