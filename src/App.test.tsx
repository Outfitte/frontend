import { render, screen } from '@/test/utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth'
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
  })

  it('App should render loading spinner when isHydrating is true', () => {
    render(<App />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
