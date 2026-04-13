import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { useAuthStore } from '@/stores/auth'
import { SettingsPage } from '@/pages/SettingsPage'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

const adminUser = {
  id: 'user-admin-001',
  email: 'admin@example.com',
  role: 'admin' as const,
  created_at: '2026-01-01T00:00:00Z',
}

const regularUser = {
  id: 'user-001',
  email: 'alice@example.com',
  role: 'user' as const,
  created_at: '2026-01-01T00:00:00Z',
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: null,
      isAuthenticated: true,
      isHydrating: false,
    })
  })

  // --- Failure / error cases ---

  it('SettingsPage should not render user info when user is null', () => {
    render(<SettingsPage />)

    expect(screen.queryByText(/alice@example\.com/)).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
  })

  it('SettingsPage should not show admin section when user role is user', () => {
    useAuthStore.setState({ user: regularUser })
    render(<SettingsPage />)

    expect(screen.queryByRole('switch', { name: /registration/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^admin$/i })).not.toBeInTheDocument()
  })

  it('SettingsPage should show error message when GET /admin/settings fails', async () => {
    useAuthStore.setState({ user: adminUser })
    server.use(
      http.get('/api/admin/settings', () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
      )
    )
    render(<SettingsPage />)

    expect(await screen.findByText(/failed to load admin settings/i)).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /registration/i })).not.toBeInTheDocument()
  })

  it('SettingsPage should show error toast and revert switch when PATCH /admin/settings fails', async () => {
    useAuthStore.setState({ user: adminUser })
    server.use(
      http.get('/api/admin/settings', () =>
        HttpResponse.json({ registration_enabled: true })
      ),
      http.patch('/api/admin/settings', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    const user = userEvent.setup()
    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /registration/i })
    expect(toggle).toBeChecked()

    await user.click(toggle)

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Server error')
    })
    expect(screen.getByRole('switch', { name: /registration/i })).toBeChecked()
  })

  // --- Happy path ---

  it('SettingsPage should show user email and role when user is set', () => {
    useAuthStore.setState({ user: regularUser })
    render(<SettingsPage />)

    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
    expect(screen.getByText(/user/)).toBeInTheDocument()
  })

  it('SettingsPage should show admin section with registration toggle when user role is admin', async () => {
    useAuthStore.setState({ user: adminUser })
    server.use(
      http.get('/api/admin/settings', () =>
        HttpResponse.json({ registration_enabled: false })
      )
    )
    render(<SettingsPage />)

    expect(await screen.findByRole('switch', { name: /registration/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^admin$/i })).toBeInTheDocument()
  })

  it('SettingsPage should reflect registration_enabled from API when admin loads settings', async () => {
    useAuthStore.setState({ user: adminUser })
    server.use(
      http.get('/api/admin/settings', () =>
        HttpResponse.json({ registration_enabled: false })
      )
    )
    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /registration/i })
    expect(toggle).not.toBeChecked()
  })

  it('SettingsPage should send PATCH and optimistically update switch when registration toggle is clicked', async () => {
    useAuthStore.setState({ user: adminUser })
    let resolvePatch!: () => void
    let capturedBody: unknown
    server.use(
      http.get('/api/admin/settings', () =>
        HttpResponse.json({ registration_enabled: true })
      ),
      http.patch('/api/admin/settings', async ({ request }) => {
        capturedBody = await request.json()
        await new Promise<void>((resolve) => { resolvePatch = resolve })
        return HttpResponse.json({ registration_enabled: false })
      })
    )
    const user = userEvent.setup()
    render(<SettingsPage />)

    const toggle = await screen.findByRole('switch', { name: /registration/i })
    expect(toggle).toBeChecked()

    await user.click(toggle)

    // Optimistic update should be applied immediately before PATCH resolves
    expect(screen.getByRole('switch', { name: /registration/i })).not.toBeChecked()
    expect(capturedBody).toEqual({ registration_enabled: false })

    await act(async () => { resolvePatch() })
  })

  it('SettingsPage should change html dark class and persist to localStorage when dark theme is selected', async () => {
    useAuthStore.setState({ user: regularUser })
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /dark/i }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('SettingsPage should remove html dark class and persist to localStorage when light theme is selected', async () => {
    useAuthStore.setState({ user: regularUser })
    document.documentElement.classList.add('dark')
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /light/i }))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('SettingsPage should persist system theme to localStorage when system theme is selected', async () => {
    useAuthStore.setState({ user: regularUser })
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /system/i }))

    expect(localStorage.getItem('theme')).toBe('system')
  })
})
