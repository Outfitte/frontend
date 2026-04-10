import { create } from 'zustand'
import type { User } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const REFRESH_TOKEN_KEY = 'refresh_token'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  isHydrating: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => Promise<void>
  hydrateFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>(() => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  setTokens: (access, refresh) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    useAuthStore.setState({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
  },
  setUser: (user) => {
    useAuthStore.setState({ user })
  },
  logout: async () => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' }).catch(() => {})
  },
  hydrateFromStorage: async () => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!stored) {
      useAuthStore.setState({ isHydrating: false })
      return
    }
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored }),
    })
    if (!response.ok) {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      useAuthStore.setState({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isHydrating: false,
      })
      return
    }
    const data = await response.json()
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
    useAuthStore.setState({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: data.user,
      isAuthenticated: true,
      isHydrating: false,
    })
  },
}))
