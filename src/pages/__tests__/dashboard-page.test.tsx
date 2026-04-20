import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { useAuthStore } from '@/stores/auth'
import { mockItem, mockLocation } from '@/test/mocks/fixtures'
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

  // --- Failure / loading / edge cases ---

  it('DashboardPage should show loading skeletons while data is fetching', () => {
    server.use(
      http.get('/api/items', async () => {
        await new Promise(() => {}) // never resolves
      }),
      http.get('/api/locations', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    render(<DashboardPage />)

    expect(screen.getAllByTestId('stat-card-skeleton').length).toBeGreaterThan(0)
  })

  it('DashboardPage should show zero counts when API returns an error', async () => {
    server.use(
      http.get('/api/items', () => HttpResponse.json({ error: 'server error' }, { status: 500 })),
      http.get('/api/locations', () => HttpResponse.json({ error: 'server error' }, { status: 500 }))
    )
    render(<DashboardPage />)

    const itemsCard = await screen.findByTestId('stat-total-items')
    expect(itemsCard).toHaveTextContent('0')
    const locationsCard = screen.getByTestId('stat-total-locations')
    expect(locationsCard).toHaveTextContent('0')
    const recentCard = screen.getByTestId('stat-recently-added')
    expect(recentCard).toHaveTextContent('—')
  })

  it('DashboardPage should show empty state with CTA when wardrobe is empty', async () => {
    server.use(
      http.get('/api/items', () => HttpResponse.json([])),
      http.get('/api/locations', () => HttpResponse.json([]))
    )
    render(<DashboardPage />)

    expect(await screen.findByText(/no items yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add your first item/i })).toBeInTheDocument()
  })

  it('DashboardPage should not render user email when user is null', () => {
    render(<DashboardPage />)

    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
  })

  // --- Happy path ---

  it('DashboardPage should render welcome heading when user is null', () => {
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

  it('DashboardPage should show quick action link to add a new item', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('link', { name: /add item/i })).toHaveAttribute('href', '/items/new')
  })

  it('DashboardPage should show total active item count when items are loaded', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', name: 'Blue Denim Jacket' }),
            mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
            mockItem({ id: 'item-003', name: 'White Sneakers' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-total-items')
    expect(card).toHaveTextContent('3')
    expect(card).toHaveTextContent(/total items/i)
  })

  it('DashboardPage should show total location count when locations are loaded', async () => {
    server.use(
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet' }),
          mockLocation({ id: 'loc-002', label: 'Spare Room' }),
          mockLocation({ id: 'loc-003', label: 'Attic' }),
        ])
      )
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-total-locations')
    expect(card).toHaveTextContent('3')
    expect(card).toHaveTextContent(/total locations/i)
  })

  it('DashboardPage should show most recently added item name when items exist', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', name: 'Blue Denim Jacket', created_at: '2026-03-01T00:00:00Z' }),
            mockItem({ id: 'item-002', name: 'White Sneakers', created_at: '2026-04-15T00:00:00Z' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-recently-added')
    expect(card).toHaveTextContent('White Sneakers')
    expect(card).toHaveTextContent(/recently added/i)
  })

  it('DashboardPage should show wardrobe value summed from active item purchase prices', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', purchase_price: '89.99', purchase_currency: 'USD' }),
            mockItem({ id: 'item-002', purchase_price: '45.00', purchase_currency: 'USD' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-wardrobe-value')
    expect(card).toHaveTextContent('$134.99')
    expect(card).toHaveTextContent(/wardrobe value/i)
  })

  it('DashboardPage should show per-currency totals when items have mixed currencies', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', purchase_price: '100.00', purchase_currency: 'USD' }),
            mockItem({ id: 'item-002', purchase_price: '50.00', purchase_currency: 'EUR' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-wardrobe-value')
    expect(card).toHaveTextContent('$100.00 + €50.00')
  })

  it('DashboardPage should default to USD when item has no purchase_currency', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', purchase_price: '75.00', purchase_currency: null }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-wardrobe-value')
    expect(card).toHaveTextContent('$75.00')
  })

  it('DashboardPage should show raw currency code when currency symbol is unknown', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', purchase_price: '200.00', purchase_currency: 'CHF' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-wardrobe-value')
    expect(card).toHaveTextContent('CHF200.00')
  })

  it('DashboardPage should show raw currency code in multi-currency value when symbol is unknown', async () => {
    server.use(
      http.get('/api/items', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('status') === 'active') {
          return HttpResponse.json([
            mockItem({ id: 'item-001', purchase_price: '100.00', purchase_currency: 'CHF' }),
            mockItem({ id: 'item-002', purchase_price: '50.00', purchase_currency: 'USD' }),
          ])
        }
        return HttpResponse.json([])
      })
    )
    render(<DashboardPage />)

    const card = await screen.findByTestId('stat-wardrobe-value')
    expect(card).toHaveTextContent('CHF100.00 + $50.00')
  })
})
