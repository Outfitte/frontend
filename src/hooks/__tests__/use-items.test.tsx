import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockItem } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import type { Item } from '@/types'
import {
  useItems,
  useItem,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useArchiveItem,
  useUnarchiveItem,
  useDisposeItem,
  useAssignLocation,
} from '@/hooks/use-items'

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

// ─── useItems ────────────────────────────────────────────────────────────────

describe('useItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useItems should return error when GET /items returns 500', async () => {
    server.use(
      http.get('/api/items', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItems(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useItems should return Item[] when GET /items returns list', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItems(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
  })

  it('useItems should pass status=archived to GET /items when called with "archived"', async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get('/api/items', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([mockItem({ id: 'item-001' })])
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItems('archived'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl).toContain('status=archived')
  })

  it('useItems should pass status=all to GET /items when called with "all"', async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get('/api/items', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([mockItem({ id: 'item-001' })])
      })
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItems('all'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl).toContain('status=all')
  })
})

// ─── useItem ─────────────────────────────────────────────────────────────────

describe('useItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useItem should return 404 error when item not found', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItem('item-missing'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(404)
    expect(result.current.error?.message).toBe('Item not found')
  })

  it('useItem should return Item when GET /items/:id returns item', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useItem('item-001'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockItem({ id: 'item-001' }))
  })
})

// ─── useCreateItem ────────────────────────────────────────────────────────────

describe('useCreateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateItem should call toast.error when POST /items returns 400', async () => {
    server.use(
      http.post('/api/items', () =>
        HttpResponse.json({ error: 'Validation failed' }, { status: 400 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateItem(), { wrapper })
    act(() => { result.current.mutate({ name: 'Test Item' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Validation failed')
  })

  it('useCreateItem should call toast.success and invalidate items list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateItem(), { wrapper })
    act(() => { result.current.mutate({ name: 'Blue Denim Jacket' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockItem({ id: 'item-new-001', name: 'Blue Denim Jacket' }))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
  })
})

// ─── useUpdateItem ────────────────────────────────────────────────────────────

describe('useUpdateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUpdateItem should call toast.error when PATCH /items/:id returns 404', async () => {
    server.use(
      http.patch('/api/items/:id', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateItem(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-missing', data: { name: 'Updated Name' } }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not found')
  })

  it('useUpdateItem should call toast.success and invalidate list and detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateItem(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-001', data: { name: 'Updated Blue Denim Jacket' } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})

// ─── useDeleteItem ────────────────────────────────────────────────────────────

describe('useDeleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteItem should call toast.error when DELETE /items/:id returns 404', async () => {
    server.use(
      http.delete('/api/items/:id', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteItem(), { wrapper })
    act(() => { result.current.mutate('item-missing') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not found')
  })

  it('useDeleteItem should call toast.success and invalidate items list on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteItem(), { wrapper })
    act(() => { result.current.mutate('item-001') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
  })
})

// ─── useArchiveItem ───────────────────────────────────────────────────────────

describe('useArchiveItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useArchiveItem should call toast.error and roll back optimistic update when POST /items/:id/archive returns 400', async () => {
    server.use(
      http.post('/api/items/:id/archive', () =>
        HttpResponse.json({ error: 'Archive failed' }, { status: 400 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData<Item[]>(queryKeys.items.list(), [
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
    const { result } = renderHook(() => useArchiveItem(), { wrapper })
    act(() => { result.current.mutate('item-001') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = queryClient.getQueryData<Item[]>(queryKeys.items.list())
    expect(data).toHaveLength(2)
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Archive failed')
  })

  it('useArchiveItem should optimistically remove item from list and invalidate list and detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<Item[]>(queryKeys.items.list(), [
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
    const { result } = renderHook(() => useArchiveItem(), { wrapper })
    act(() => { result.current.mutate('item-001') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})

// ─── useUnarchiveItem ─────────────────────────────────────────────────────────

describe('useUnarchiveItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUnarchiveItem should call toast.error and roll back optimistic update when POST /items/:id/unarchive returns 400', async () => {
    server.use(
      http.post('/api/items/:id/unarchive', () =>
        HttpResponse.json({ error: 'Unarchive failed' }, { status: 400 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData<Item[]>(queryKeys.items.list('archived'), [
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
    const { result } = renderHook(() => useUnarchiveItem(), { wrapper })
    act(() => { result.current.mutate('item-001') })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = queryClient.getQueryData<Item[]>(queryKeys.items.list('archived'))
    expect(data).toHaveLength(2)
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Unarchive failed')
  })

  it('useUnarchiveItem should optimistically remove item from archived list and invalidate list and detail on success', async () => {
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData<Item[]>(queryKeys.items.list('archived'), [
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
    const { result } = renderHook(() => useUnarchiveItem(), { wrapper })
    act(() => { result.current.mutate('item-001') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})

// ─── useDisposeItem ───────────────────────────────────────────────────────────

describe('useDisposeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDisposeItem should call toast.error when POST /items/:id/dispose returns 400', async () => {
    server.use(
      http.post('/api/items/:id/dispose', () =>
        HttpResponse.json({ error: 'Dispose failed' }, { status: 400 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDisposeItem(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-001', reason: 'donated' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Dispose failed')
  })

  it('useDisposeItem should call toast.success and send reason in body and invalidate list and detail on success', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.post('/api/items/:id/dispose', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDisposeItem(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-001', reason: 'donated' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({ reason: 'donated' })
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})

// ─── useAssignLocation ────────────────────────────────────────────────────────

describe('useAssignLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useAssignLocation should call toast.error when PATCH /items/:id/location returns 404', async () => {
    server.use(
      http.patch('/api/items/:id/location', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAssignLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-missing', location_id: 'loc-001' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Item not found')
  })

  it('useAssignLocation should call toast.success and send location_id in body and invalidate detail on success', async () => {
    let capturedBody: Record<string, unknown> | undefined
    server.use(
      http.patch('/api/items/:id/location', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAssignLocation(), { wrapper })
    act(() => { result.current.mutate({ id: 'item-001', location_id: 'loc-002' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedBody).toEqual({ location_id: 'loc-002' })
    const { toast } = await import('@/lib/toast')
    expect(toast.success).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.items.detail('item-001') })
  })
})
