import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import {
  useLogin,
  useRegister,
  useLogout,
  useRefreshToken,
} from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useLogin', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('useLogin should call toast.error with network error message when fetch throws', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.error()))
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Network error')
  })

  it('useLogin should call toast.error with Unknown error when server returns non-JSON error response', async () => {
    server.use(
      http.post(
        '/api/auth/login',
        () =>
          new HttpResponse('Gateway Timeout', {
            status: 504,
            headers: { 'Content-Type': 'text/plain' },
          })
      )
    )
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Unknown error')
  })

  it('useLogin should call toast.error with Unknown error when server returns error without error field', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'something went wrong' }, { status: 400 })
      )
    )
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Unknown error')
  })

  it('useLogin should call toast.error with ApiError message when server returns 401', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'wrongpassword',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
  })

  it('useLogin should leave user as null when GET /users/me returns 500 after successful login', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      ),
      http.get('/api/users/me', () => new HttpResponse(null, { status: 500 }))
    )
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-token-abc123')
    expect(state.refreshToken).toBe('refresh-token-xyz789')
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toBeNull()
    const { toast } = await import('@/lib/toast')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('useLogin should not call options.onSuccess when login request fails', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    )
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useLogin({ onSuccess }), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'wrongpassword',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('useLogin should set user in auth store when GET /users/me returns user data after successful login', async () => {
    const user = {
      id: 'user-001',
      email: 'alice@example.com',
      role: 'user' as const,
      created_at: '2024-01-01T00:00:00Z',
    }
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      ),
      http.get('/api/users/me', () => HttpResponse.json(user))
    )
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-token-abc123')
    expect(state.refreshToken).toBe('refresh-token-xyz789')
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(user)
  })

  it('useLogin should call options.onSuccess after tokens and user are set when login succeeds', async () => {
    const user = {
      id: 'user-001',
      email: 'alice@example.com',
      role: 'user' as const,
      created_at: '2024-01-01T00:00:00Z',
    }
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      ),
      http.get('/api/users/me', () => HttpResponse.json(user))
    )
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useLogin({ onSuccess }), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(user)
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})

describe('useRegister', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('useRegister should call toast.error with ApiError message when server returns 409', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json({ error: 'Email already in use' }, { status: 409 })
      )
    )
    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Email already in use')
  })

  it('useRegister should set tokens and user in auth store when server returns 201', async () => {
    const user = {
      id: 'user-001',
      email: 'alice@example.com',
      role: 'user' as const,
      created_at: '2024-01-01T00:00:00Z',
    }
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          {
            user,
            access_token: 'access-token-abc123',
            refresh_token: 'refresh-token-xyz789',
          },
          { status: 201 }
        )
      )
    )
    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({
        username: 'alice@example.com',
        password: 'secret123',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-token-abc123')
    expect(state.refreshToken).toBe('refresh-token-xyz789')
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })
})

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: {
        id: 'user-001',
        email: 'alice@example.com',
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      isHydrating: false,
    })
    localStorage.setItem('refresh_token', 'refresh-token-xyz789')
    vi.clearAllMocks()
  })

  it('useLogout should call toast.error and clear auth state when server returns 401', async () => {
    server.use(
      http.post('/api/auth/logout', () =>
        HttpResponse.json({ error: 'Token already revoked' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).toHaveBeenCalledWith('Token already revoked')
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('useLogout should clear auth store and invalidate queries when server returns 204', async () => {
    server.use(
      http.post(
        '/api/auth/logout',
        () => new HttpResponse(null, { status: 204 })
      )
    )
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useLogout(), { wrapper })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useRefreshToken', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('useRefreshToken should expose error via mutation state without calling toast when server returns 401', async () => {
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ error: 'Refresh token expired' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useRefreshToken(), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({ refresh_token: 'expired-refresh-token-xyz789' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const { toast } = await import('@/lib/toast')
    expect(toast.error).not.toHaveBeenCalled()
    expect(result.current.error?.message).toBe('Refresh token expired')
  })

  it('useRefreshToken should update tokens in auth store when server returns 200 with new token pair', async () => {
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'new-access-token-abc123',
          refresh_token: 'new-refresh-token-xyz789',
        })
      )
    )
    const { result } = renderHook(() => useRefreshToken(), {
      wrapper: makeWrapper(),
    })

    act(() => {
      result.current.mutate({ refresh_token: 'old-refresh-token-xyz789' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new-access-token-abc123')
    expect(state.refreshToken).toBe('new-refresh-token-xyz789')
    expect(state.isAuthenticated).toBe(true)
  })
})
