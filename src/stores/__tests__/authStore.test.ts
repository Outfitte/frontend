import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null })
  })

  it('authStore should have null token and refreshToken by default', () => {
    const { token, refreshToken } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(refreshToken).toBeNull()
  })

  it('authStore.clearAuth should set token and refreshToken to null when called with existing auth', () => {
    useAuthStore.getState().setAuth('access-token-abc123', 'refresh-token-xyz789')
    useAuthStore.getState().clearAuth()
    const { token, refreshToken } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(refreshToken).toBeNull()
  })

  it('authStore.setAuth should store token and refreshToken when called with credentials', () => {
    useAuthStore.getState().setAuth('access-token-abc123', 'refresh-token-xyz789')
    const { token, refreshToken } = useAuthStore.getState()
    expect(token).toBe('access-token-abc123')
    expect(refreshToken).toBe('refresh-token-xyz789')
  })

  it('authStore.setAuth should overwrite existing auth when called again with new credentials', () => {
    useAuthStore.getState().setAuth('old-token', 'old-refresh')
    useAuthStore.getState().setAuth('new-token-abc123', 'new-refresh-xyz789')
    const { token, refreshToken } = useAuthStore.getState()
    expect(token).toBe('new-token-abc123')
    expect(refreshToken).toBe('new-refresh-xyz789')
  })
})
