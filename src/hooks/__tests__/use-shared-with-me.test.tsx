import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockSharedItem, mockSharedOutfit, mockSharedLocation } from '@/test/mocks/fixtures'
import { useSharedWithMe } from '@/hooks/use-shared-with-me'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

// ─── useSharedWithMe ──────────────────────────────────────────────────────────

describe('useSharedWithMe', () => {
  it('useSharedWithMe should return error when GET /shares/with-me returns 500', async () => {
    server.use(
      http.get('/api/shares/with-me', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSharedWithMe(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useSharedWithMe should return error when GET /shares/with-me returns 401', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSharedWithMe(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(401)
  })

  it('useSharedWithMe should reflect loading state then data when GET /shares/with-me succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSharedWithMe(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ items: [], outfits: [], locations: [] })
  })

  it('useSharedWithMe should return empty arrays when nothing is shared with the user', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSharedWithMe(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual([])
    expect(result.current.data?.outfits).toEqual([])
    expect(result.current.data?.locations).toEqual([])
  })

  it('useSharedWithMe should return SharedWithMeResult with items, outfits, locations when GET /shares/with-me returns data', async () => {
    const sharedItem = mockSharedItem({ id: 'item-shared-001', name: 'Shared Jacket' })
    const sharedOutfit = mockSharedOutfit({ id: 'outfit-shared-001', name: 'Shared Casual' })
    const sharedLocation = mockSharedLocation()
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [sharedItem],
          outfits: [sharedOutfit],
          locations: [sharedLocation],
        })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSharedWithMe(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      items: [sharedItem],
      outfits: [sharedOutfit],
      locations: [sharedLocation],
    })
  })
})
