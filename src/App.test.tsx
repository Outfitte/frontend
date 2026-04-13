import { render, screen } from '@/test/utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: true,
      hydrateFromStorage: async () => {},
    })
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ theme: 'system' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  it('App should render loading spinner when isHydrating is true', () => {
    render(<App />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('App should not apply dark class to documentElement on mount when localStorage theme is light', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'light')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('App should not apply dark class to documentElement on mount when localStorage has no theme', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('App should apply dark class to documentElement on mount when localStorage theme is dark', () => {
    localStorage.setItem('theme', 'dark')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
