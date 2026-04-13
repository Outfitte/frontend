import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/utils'
import { useAuthStore } from '@/stores/auth'
import { DashboardPage } from '@/pages/DashboardPage'

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    })
  })

  // --- Failure / edge cases ---

  it('DashboardPage should not render user email when user is null', () => {
    render(<DashboardPage />)

    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
  })

  // --- Happy path ---

  it('DashboardPage should render welcome heading', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('heading', { name: /welcome to outfitte/i })).toBeInTheDocument()
  })

  it('DashboardPage should render user email in welcome heading when user is set', () => {
    useAuthStore.setState({
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2026-01-01T00:00:00Z' },
    })

    render(<DashboardPage />)

    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('DashboardPage should render total items stat card', () => {
    render(<DashboardPage />)

    expect(screen.getByText(/total items/i)).toBeInTheDocument()
  })

  it('DashboardPage should render recent outfits stat card', () => {
    render(<DashboardPage />)

    expect(screen.getByText(/recent outfits/i)).toBeInTheDocument()
  })
})
