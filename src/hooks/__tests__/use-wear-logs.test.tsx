import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockWearLog } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/lib/toast'
import {
  useWearLogs,
  useLogWear,
  useDeleteWearLog,
} from '@/hooks/use-wear-logs'

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

// ─── useWearLogs ──────────────────────────────────────────────────────────────

describe('useWearLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useWearLogs should not fetch when itemId is undefined', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWearLogs(undefined), { wrapper })
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(result.current.data).toBeUndefined()
  })

  it('useWearLogs should set isError when GET /items/:id/wear-logs returns 404 item not found', async () => {
    server.use(
      http.get('/api/items/:id/wear-logs', () =>
        HttpResponse.json({ error: 'Item not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWearLogs('item-missing'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Item not found')
  })

  it('useWearLogs should return empty array when no logs exist', async () => {
    server.use(
      http.get('/api/items/:id/wear-logs', () => HttpResponse.json([]))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWearLogs('item-001'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('useWearLogs should return WearLog[] ordered by worn_on desc when fetch succeeds', async () => {
    const logs = [
      mockWearLog({
        id: 'wearlog-001',
        item_id: 'item-001',
        worn_on: '2026-04-10',
      }),
      mockWearLog({
        id: 'wearlog-002',
        item_id: 'item-001',
        worn_on: '2026-04-12',
      }),
      mockWearLog({
        id: 'wearlog-003',
        item_id: 'item-001',
        worn_on: '2026-04-11',
      }),
    ]
    server.use(
      http.get('/api/items/:id/wear-logs', () => HttpResponse.json(logs))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWearLogs('item-001'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const wornDates = result.current.data!.map((l) => l.worn_on)
    expect(wornDates).toEqual(['2026-04-12', '2026-04-11', '2026-04-10'])
  })
})

// ─── useLogWear ───────────────────────────────────────────────────────────────

describe('useLogWear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useLogWear should call toast.error when POST /items/:id/wear-logs returns 422 future date', async () => {
    server.use(
      http.post('/api/items/:id/wear-logs', () =>
        HttpResponse.json(
          { error: 'worn_on cannot be in the future' },
          { status: 422 }
        )
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLogWear(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', worn_on: '2099-01-01' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('worn_on cannot be in the future')
  })

  it('useLogWear should call toast.success and invalidate wear logs and item detail when POST succeeds', async () => {
    server.use(
      http.post('/api/items/:id/wear-logs', ({ params, request: req }) =>
        req.json().then((body) =>
          HttpResponse.json(
            mockWearLog({
              id: 'wearlog-new-001',
              item_id: params['id'] as string,
              worn_on: (body as Record<string, string>)['worn_on'],
            }),
            { status: 201 }
          )
        )
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useLogWear(), { wrapper })
    act(() => {
      result.current.mutate({
        itemId: 'item-001',
        worn_on: '2026-04-15',
        notes: 'Team meeting',
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: 'wearlog-new-001',
      worn_on: '2026-04-15',
    })
    expect(toast.success).toHaveBeenCalledWith('Wear logged')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.wearLogs('item-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.detail('item-001'),
    })
  })
})

// ─── useDeleteWearLog ─────────────────────────────────────────────────────────

describe('useDeleteWearLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteWearLog should call toast.error when DELETE /items/:id/wear-logs/:logID returns 404 not found', async () => {
    server.use(
      http.delete('/api/items/:id/wear-logs/:logID', () =>
        HttpResponse.json({ error: 'Wear log not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteWearLog(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', logId: 'wearlog-missing' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Wear log not found')
  })

  it('useDeleteWearLog should invalidate wear logs and item detail on error', async () => {
    server.use(
      http.delete('/api/items/:id/wear-logs/:logID', () =>
        HttpResponse.json({ error: 'Wear log not found' }, { status: 404 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteWearLog(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', logId: 'wearlog-missing' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.wearLogs('item-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.detail('item-001'),
    })
  })

  it('useDeleteWearLog should call toast.success and invalidate wear logs and item detail when DELETE returns 204', async () => {
    server.use(
      http.delete(
        '/api/items/:id/wear-logs/:logID',
        () => new HttpResponse(null, { status: 204 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteWearLog(), { wrapper })
    act(() => {
      result.current.mutate({ itemId: 'item-001', logId: 'wearlog-001' })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Wear log deleted')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.wearLogs('item-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.detail('item-001'),
    })
  })
})
