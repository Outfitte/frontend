import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockCategory } from '@/test/mocks/fixtures'
import { useCategories } from '@/hooks/use-categories'

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

// ─── useCategories ────────────────────────────────────────────────────────────

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCategories should set isError when GET /categories returns 500 server error', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Internal server error')
  })

  it('useCategories should return Category[] with field_hints when GET /categories succeeds', async () => {
    const categories = [
      mockCategory({ id: 'cat-001', label: 'Jackets' }),
      mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
    ]
    server.use(
      http.get('/api/categories', () => HttpResponse.json(categories))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0]).toMatchObject({
      id: 'cat-001',
      label: 'Jackets',
      is_preset: true,
    })
    expect(result.current.data![0].field_hints).toHaveLength(2)
  })

  it('useCategories should return preset categories with expected field hints for Tops', async () => {
    const topsCategory = mockCategory({
      id: 'cat-tops',
      label: 'Tops',
      is_preset: true,
      field_hints: [
        { key: 'size', label: 'Size', placeholder: 'e.g. S, M, L, XL' },
        { key: 'fabric', label: 'Fabric', placeholder: 'e.g. cotton, polyester' },
        { key: 'fit', label: 'Fit', placeholder: 'e.g. slim, relaxed, oversized' },
      ],
    })
    server.use(
      http.get('/api/categories', () => HttpResponse.json([topsCategory]))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const tops = result.current.data!.find((c) => c.label === 'Tops')
    expect(tops).toBeDefined()
    expect(tops!.is_preset).toBe(true)
    const hintKeys = tops!.field_hints.map((h) => h.key)
    expect(hintKeys).toContain('size')
    expect(hintKeys).toContain('fabric')
    expect(hintKeys).toContain('fit')
  })
})
