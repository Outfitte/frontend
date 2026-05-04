import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { mockUserSummary } from '@/test/mocks/fixtures'
import { useUsers, useMe } from '@/hooks/use-users'

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

// ─── useUsers ────────────────────────────────────────────────────────────────

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useUsers should return error when GET /users returns 500', async () => {
    server.use(
      http.get('/api/users', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useUsers should return 401 error when GET /users returns 401 and refresh also fails', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ error: 'Token expired' }, { status: 401 })
      )
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(401)
  })

  it('useUsers should reflect loading state initially then return UserSummary[] when GET /users succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUsers(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      mockUserSummary({ id: 'user-001' }),
      mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
    ])
  })
})

// ─── useMe ───────────────────────────────────────────────────────────────────

describe('useMe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useMe should return error when GET /users/me returns 500', async () => {
    server.use(
      http.get('/api/users/me', () => new HttpResponse(null, { status: 500 }))
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMe(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.status).toBe(500)
  })

  it('useMe should reflect loading state initially then return authenticated User when GET /users/me succeeds', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMe(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: 'user-001',
      email: 'user@example.com',
      role: 'user',
      created_at: '2026-01-01T00:00:00Z',
    })
  })
})
