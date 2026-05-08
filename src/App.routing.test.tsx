import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { render, screen } from '@/test/utils'
import { useAuthStore } from '@/stores/auth'
import App from '@/App'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}{location.search}</div>
}

function AppWithLocation() {
  return (
    <>
      <App />
      <LocationDisplay />
    </>
  )
}

describe('Routing', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
  })

  // --- Failure / redirect cases ---

  it('App should redirect to /login when unauthenticated user visits /', () => {
    render(<AppWithLocation />, { initialEntries: ['/'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should redirect to /login preserving return URL when unauthenticated user visits /settings', () => {
    render(<AppWithLocation />, { initialEntries: ['/settings'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fsettings')
  })

  it('App should redirect to /login when unauthenticated user visits /items', () => {
    render(<AppWithLocation />, { initialEntries: ['/items'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /items/new', () => {
    render(<AppWithLocation />, { initialEntries: ['/items/new'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /items/:id', () => {
    render(<AppWithLocation />, { initialEntries: ['/items/item-001'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /items/:id/edit', () => {
    render(<AppWithLocation />, { initialEntries: ['/items/item-001/edit'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /locations', () => {
    render(<AppWithLocation />, { initialEntries: ['/locations'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Flocations')
  })

  it('App should redirect to /login when unauthenticated user visits /outfits', () => {
    render(<AppWithLocation />, { initialEntries: ['/outfits'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Foutfits')
  })

  it('App should redirect to /login when unauthenticated user visits /outfits/new', () => {
    render(<AppWithLocation />, { initialEntries: ['/outfits/new'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Foutfits%2Fnew')
  })

  it('App should redirect to /login when unauthenticated user visits /calendar', () => {
    render(<AppWithLocation />, { initialEntries: ['/calendar'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fcalendar')
  })

  it('App should redirect to /login when unauthenticated user visits /shared', () => {
    render(<AppWithLocation />, { initialEntries: ['/shared'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fshared')
  })

  it('App should redirect to / when authenticated user visits /login', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/login'] })
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('App should redirect to / when authenticated user visits /register', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/register'] })
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('App should render 404 page when route does not exist', () => {
    render(<AppWithLocation />, { initialEntries: ['/this-route-does-not-exist'] })
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument()
  })

  it('App should show loading spinner while isHydrating is true then render route when resolved', async () => {
    let resolveHydration!: () => void
    const hydrationPromise = new Promise<void>((resolve) => {
      resolveHydration = resolve
    })
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: true,
      hydrateFromStorage: async () => {
        await hydrationPromise
        useAuthStore.setState({ isHydrating: false })
      },
    })

    render(<AppWithLocation />, { initialEntries: ['/'] })
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    await act(async () => {
      resolveHydration()
      await hydrationPromise
    })

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('App should render dashboard when authenticated user visits /', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/'] })
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('App should render register page when unauthenticated user visits /register', () => {
    render(<AppWithLocation />, { initialEntries: ['/register'] })
    expect(screen.getByTestId('register-page')).toBeInTheDocument()
  })

  it('App should render items page when authenticated user visits /items', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/items'] })
    expect(screen.getByTestId('items-page')).toBeInTheDocument()
  })

  it('App should render create item page when authenticated user visits /items/new', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/items/new'] })
    expect(screen.getByTestId('create-item-page')).toBeInTheDocument()
  })

  it('App should render item detail page when authenticated user visits /items/:id', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/items/item-001'] })
    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('App should render edit item page when authenticated user visits /items/:id/edit', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/items/item-001/edit'] })
    expect(await screen.findByTestId('edit-item-page')).toBeInTheDocument()
  })

  it('App should render outfits page when authenticated user visits /outfits', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/outfits'] })
    expect(screen.getByTestId('outfits-page')).toBeInTheDocument()
  })

  it('App should render create outfit page when authenticated user visits /outfits/new', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/outfits/new'] })
    expect(screen.getByTestId('create-outfit-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /outfits/:id', () => {
    render(<AppWithLocation />, { initialEntries: ['/outfits/outfit-001'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render outfit detail page when authenticated user visits /outfits/:id', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/outfits/outfit-001'] })
    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /outfits/:id/edit', () => {
    render(<AppWithLocation />, { initialEntries: ['/outfits/outfit-001/edit'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render edit outfit page when authenticated user visits /outfits/:id/edit', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/outfits/outfit-001/edit'] })
    expect(await screen.findByTestId('edit-outfit-page')).toBeInTheDocument()
  })

  it('App should render calendar page when authenticated user visits /calendar', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/calendar'] })
    expect(screen.getByTestId('calendar-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /shares', () => {
    render(<AppWithLocation />, { initialEntries: ['/shares'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render outgoing shares page when authenticated user visits /shares', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/shares'] })
    expect(await screen.findByTestId('outgoing-shares-page')).toBeInTheDocument()
  })

  it('App should render shared page when authenticated user visits /shared', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/shared'] })
    expect(await screen.findByTestId('shared-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /shared/items/:id', () => {
    render(<AppWithLocation />, { initialEntries: ['/shared/items/item-001'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render shared item detail page when authenticated user visits /shared/items/:id', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/shared/items/item-001'] })
    expect(await screen.findByTestId('shared-item-detail-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /shared/outfits/:id', () => {
    render(<AppWithLocation />, { initialEntries: ['/shared/outfits/outfit-001'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render shared outfit detail page when authenticated user visits /shared/outfits/:id', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/shared/outfits/outfit-001'] })
    expect(await screen.findByTestId('shared-outfit-detail-page')).toBeInTheDocument()
  })

  it('App should redirect to /login when unauthenticated user visits /shared/locations/:id', () => {
    render(<AppWithLocation />, { initialEntries: ['/shared/locations/loc-001'] })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('App should render shared location detail page when authenticated user visits /shared/locations/:id', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/shared/locations/loc-001'] })
    expect(await screen.findByTestId('shared-location-detail-page')).toBeInTheDocument()
  })

  it('App should render settings page when authenticated user visits /settings', () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/settings'] })
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
  })

  it('App should render locations page when authenticated user visits /locations', async () => {
    useAuthStore.setState({
      accessToken: 'access-token-abc123',
      refreshToken: 'refresh-token-xyz789',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user', created_at: '2024-01-01T00:00:00Z' },
      isAuthenticated: true,
      isHydrating: false,
      hydrateFromStorage: async () => {},
    })
    render(<AppWithLocation />, { initialEntries: ['/locations'] })
    expect(await screen.findByTestId('locations-page')).toBeInTheDocument()
  })

  it('App should redirect to /items after login when unauthenticated user was redirected from /items', async () => {
    const user = userEvent.setup()
    render(<AppWithLocation />, { initialEntries: ['/items'] })

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fitems')

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByTestId('items-page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/items')
  })
})
