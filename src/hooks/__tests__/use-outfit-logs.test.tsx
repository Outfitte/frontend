import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockOutfitLog } from '@/test/mocks/fixtures'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/lib/toast'
import {
  useOutfitLogs,
  useOutfitLogsByRange,
  useLogOutfitWear,
  useUpdateOutfitLog,
  useDeleteOutfitLog,
} from '@/hooks/use-outfit-logs'

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

// ─── useLogOutfitWear ─────────────────────────────────────────────────────────

describe('useLogOutfitWear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useLogOutfitWear should call toast.error when POST /outfits/:id/logs returns 422 future date', async () => {
    server.use(
      http.post('/api/outfits/:id/logs', () =>
        HttpResponse.json(
          { error: 'worn_on cannot be in the future' },
          { status: 422 }
        )
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLogOutfitWear(), { wrapper })
    act(() => {
      result.current.mutate({ outfitId: 'outfit-001', worn_on: '2099-01-01' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('worn_on cannot be in the future')
  })

  it('useLogOutfitWear should toast.success and invalidate outfit logs, outfitLogs.all and items.all when POST succeeds', async () => {
    server.use(
      http.post('/api/outfits/:id/logs', ({ params, request: req }) =>
        req.json().then((body) =>
          HttpResponse.json(
            mockOutfitLog({
              id: 'outfitlog-new-001',
              outfit_id: params['id'] as string,
              worn_on: (body as Record<string, string>)['worn_on'],
            }),
            { status: 201 }
          )
        )
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useLogOutfitWear(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        worn_on: '2026-04-15',
        notes: 'Date night',
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: 'outfitlog-new-001',
      worn_on: '2026-04-15',
    })
    expect(toast.success).toHaveBeenCalledWith('Outfit wear logged')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfits.logs('outfit-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfitLogs.all,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.all,
    })
  })
})

// ─── useUpdateOutfitLog ───────────────────────────────────────────────────────

describe('useUpdateOutfitLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUpdateOutfitLog should call toast.error when PATCH /outfits/:id/logs/:logID returns 404 not found', async () => {
    server.use(
      http.patch('/api/outfits/:id/logs/:logID', () =>
        HttpResponse.json({ error: 'Outfit log not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateOutfitLog(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        logId: 'outfitlog-missing',
        worn_on: '2026-04-15',
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Outfit log not found')
  })

  it('useUpdateOutfitLog should invalidate outfits.logs and outfitLogs.all and toast.success when PATCH succeeds', async () => {
    server.use(
      http.patch('/api/outfits/:id/logs/:logID', ({ params }) =>
        HttpResponse.json(
          mockOutfitLog({
            id: params['logID'] as string,
            outfit_id: params['id'] as string,
            worn_on: '2026-04-20',
          })
        )
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateOutfitLog(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        logId: 'outfitlog-001',
        worn_on: '2026-04-20',
      })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Outfit log updated')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfits.logs('outfit-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfitLogs.all,
    })
  })
})

// ─── useDeleteOutfitLog ───────────────────────────────────────────────────────

describe('useDeleteOutfitLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDeleteOutfitLog should call toast.error when DELETE /outfits/:id/logs/:logID returns 404 not found', async () => {
    server.use(
      http.delete('/api/outfits/:id/logs/:logID', () =>
        HttpResponse.json({ error: 'Outfit log not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteOutfitLog(), { wrapper })
    act(() => {
      result.current.mutate({
        outfitId: 'outfit-001',
        logId: 'outfitlog-missing',
      })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Outfit log not found')
  })

  it('useDeleteOutfitLog should toast.success and invalidate outfits.logs, outfitLogs.all and items.all when DELETE returns 204', async () => {
    server.use(
      http.delete(
        '/api/outfits/:id/logs/:logID',
        () => new HttpResponse(null, { status: 204 })
      )
    )
    const { queryClient, wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteOutfitLog(), { wrapper })
    act(() => {
      result.current.mutate({ outfitId: 'outfit-001', logId: 'outfitlog-001' })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Outfit log deleted')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfits.logs('outfit-001'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.outfitLogs.all,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items.all,
    })
  })
})

// ─── useOutfitLogsByRange ─────────────────────────────────────────────────────

describe('useOutfitLogsByRange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutfitLogsByRange should not fetch when from is undefined', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOutfitLogsByRange(undefined, '2026-04-30'),
      { wrapper }
    )
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(result.current.data).toBeUndefined()
  })

  it('useOutfitLogsByRange should not fetch when to is undefined', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOutfitLogsByRange('2026-04-01', undefined),
      { wrapper }
    )
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(result.current.data).toBeUndefined()
  })

  it('useOutfitLogsByRange should set isError when GET /outfit-logs returns 422 invalid range', async () => {
    server.use(
      http.get('/api/outfit-logs', () =>
        HttpResponse.json({ error: 'to must be after from' }, { status: 422 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOutfitLogsByRange('2026-04-30', '2026-04-01'),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('to must be after from')
  })

  it('useOutfitLogsByRange should return OutfitLog[] when GET /outfit-logs?from=...&to=... succeeds', async () => {
    const logs = [
      mockOutfitLog({
        id: 'outfitlog-001',
        outfit_id: 'outfit-001',
        worn_on: '2026-04-15',
      }),
      mockOutfitLog({
        id: 'outfitlog-002',
        outfit_id: 'outfit-002',
        worn_on: '2026-04-20',
      }),
    ]
    server.use(http.get('/api/outfit-logs', () => HttpResponse.json(logs)))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useOutfitLogsByRange('2026-04-01', '2026-04-30'),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].id).toBe('outfitlog-001')
  })
})

// ─── useOutfitLogs ────────────────────────────────────────────────────────────

describe('useOutfitLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useOutfitLogs should not fetch when outfitId is undefined', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfitLogs(undefined), { wrapper })
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(result.current.data).toBeUndefined()
  })

  it('useOutfitLogs should set isError when GET /outfits/:id/logs returns 404 outfit not found', async () => {
    server.use(
      http.get('/api/outfits/:id/logs', () =>
        HttpResponse.json({ error: 'Outfit not found' }, { status: 404 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfitLogs('outfit-missing'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Outfit not found')
  })

  it('useOutfitLogs should return OutfitLog[] sorted desc by worn_on when fetch succeeds', async () => {
    const logs = [
      mockOutfitLog({
        id: 'outfitlog-001',
        outfit_id: 'outfit-001',
        worn_on: '2026-04-10',
      }),
      mockOutfitLog({
        id: 'outfitlog-002',
        outfit_id: 'outfit-001',
        worn_on: '2026-04-12',
      }),
      mockOutfitLog({
        id: 'outfitlog-003',
        outfit_id: 'outfit-001',
        worn_on: '2026-04-11',
      }),
    ]
    server.use(http.get('/api/outfits/:id/logs', () => HttpResponse.json(logs)))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOutfitLogs('outfit-001'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const wornDates = result.current.data!.map((l) => l.worn_on)
    expect(wornDates).toEqual(['2026-04-12', '2026-04-11', '2026-04-10'])
  })
})
