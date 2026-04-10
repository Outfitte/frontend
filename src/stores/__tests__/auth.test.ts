import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { useAuthStore } from '@/stores/auth'

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: true,
    })
    localStorage.clear()
  })

  it('auth store should have null tokens, null user, false isAuthenticated, and true isHydrating when initialized', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isHydrating).toBe(true)
  })

  it('logout should clear tokens and succeed when API call throws network error', async () => {
    server.use(
      http.post('/api/auth/logout', () => HttpResponse.error())
    )
    useAuthStore.getState().setTokens('access-token-abc123', 'refresh-token-xyz789')

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('logout should clear tokens and succeed when API call fails', async () => {
    server.use(
      http.post('/api/auth/logout', () => new HttpResponse(null, { status: 500 }))
    )
    useAuthStore.getState().setTokens('access-token-abc123', 'refresh-token-xyz789')

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('hydrateFromStorage should set isHydrating to false and remain unauthenticated when no refresh token in storage', async () => {
    await useAuthStore.getState().hydrateFromStorage()

    const state = useAuthStore.getState()
    expect(state.isHydrating).toBe(false)
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
  })

  it('hydrateFromStorage should clear state and set isHydrating to false when refresh token is invalid', async () => {
    server.use(
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 }))
    )
    localStorage.setItem('refresh_token', 'invalid-refresh-token-xyz')

    await useAuthStore.getState().hydrateFromStorage()

    const state = useAuthStore.getState()
    expect(state.isHydrating).toBe(false)
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('setTokens should store access token in memory and refresh token in memory and localStorage when called', () => {
    useAuthStore.getState().setTokens('access-token-abc123', 'refresh-token-xyz789')

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-token-abc123')
    expect(state.refreshToken).toBe('refresh-token-xyz789')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token-xyz789')
  })

  it('setUser should store user in state when called', () => {
    const user = { id: 'user-001', email: 'alice@example.com', role: 'user' as const, created_at: '2024-01-01T00:00:00Z' }
    useAuthStore.getState().setUser(user)

    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('isAuthenticated should be true when accessToken is non-null', () => {
    useAuthStore.getState().setTokens('access-token-abc123', 'refresh-token-xyz789')

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('logout should clear tokens from memory and localStorage and call POST /auth/logout when tokens are set', async () => {
    let logoutCalled = false
    server.use(
      http.post('/api/auth/logout', () => {
        logoutCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    useAuthStore.getState().setTokens('access-token-abc123', 'refresh-token-xyz789')

    await useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(logoutCalled).toBe(true)
  })

  it('hydrateFromStorage should set tokens and user and set isHydrating to false when refresh token is valid', async () => {
    const user = { id: 'user-001', email: 'alice@example.com', role: 'user' as const, created_at: '2024-01-01T00:00:00Z' }
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ access_token: 'new-access-token-abc123', refresh_token: 'new-refresh-token-xyz789', user })
      )
    )
    localStorage.setItem('refresh_token', 'stored-refresh-token-xyz789')

    await useAuthStore.getState().hydrateFromStorage()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new-access-token-abc123')
    expect(state.refreshToken).toBe('new-refresh-token-xyz789')
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isHydrating).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token-xyz789')
  })
})
