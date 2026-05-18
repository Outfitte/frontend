import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockSharedItem,
  mockSharedOutfit,
  mockSharedLocation,
} from '@/test/mocks/fixtures'
import { SharedPage } from '@/pages/SharedPage'

function renderPage() {
  return render(<SharedPage />)
}

describe('SharedPage', () => {
  it('SharedPage should show error message when fetch fails', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument()
  })

  it('SharedPage should show loading skeleton while fetching', () => {
    server.use(
      http.get('/api/shares/with-me', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()
    expect(screen.getByTestId('shared-page-skeleton')).toBeInTheDocument()
  })

  it('SharedPage should show empty state when all three lists are empty', async () => {
    renderPage()
    expect(
      await screen.findByText('Nothing has been shared with you yet')
    ).toBeInTheDocument()
  })

  it('SharedPage should render Items section with shared-by badge when items are non-empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: 'item-shared-001',
              name: 'Shared Jacket',
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Items' })
    ).toBeInTheDocument()
    expect(screen.getByText('shared by alice@example.com')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /View Shared Jacket/i })
    expect(link).toHaveAttribute('href', '/shared/items/item-shared-001')
  })

  it('SharedPage should render Outfits section with shared-by badge when outfits are non-empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [
            mockSharedOutfit({
              id: 'outfit-shared-001',
              name: 'Shared Casual',
              shared_by: { id: 'user-003', email: 'bob@example.com' },
            }),
          ],
          locations: [],
        })
      )
    )
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Outfits' })
    ).toBeInTheDocument()
    expect(screen.getByText('shared by bob@example.com')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /View Shared Casual/i })
    expect(link).toHaveAttribute('href', '/shared/outfits/outfit-shared-001')
  })

  it('SharedPage should render Locations section with label, item count, and link when locations are non-empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [],
          locations: [
            mockSharedLocation({
              location: {
                id: 'loc-shared-001',
                owner_id: 'user-002',
                parent_id: null,
                label: 'Main Closet',
                created_at: '2026-01-01T00:00:00Z',
              },
              items: [{ id: 'i1' }, { id: 'i2' }] as never,
              shared_by: { id: 'user-002', email: 'carol@example.com' },
            }),
          ],
        })
      )
    )
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Locations' })
    ).toBeInTheDocument()
    expect(screen.getByText('Main Closet')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Main Closet/i })
    expect(link).toHaveAttribute('href', '/shared/locations/loc-shared-001')
  })

  it('SharedPage should have data-testid="shared-page" on root element when data is loaded', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: 'item-001', name: 'Blue Jacket' })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()
    expect(await screen.findByTestId('shared-page')).toBeInTheDocument()
  })

  it('SharedPage should not render Outfits section when outfits list is empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: 'item-001', name: 'Blue Jacket' })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()
    await screen.findByTestId('shared-page')
    expect(
      screen.queryByRole('heading', { name: 'Outfits' })
    ).not.toBeInTheDocument()
  })

  it('SharedPage should not render Locations section when locations list is empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: 'item-001', name: 'Blue Jacket' })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()
    await screen.findByTestId('shared-page')
    expect(
      screen.queryByRole('heading', { name: 'Locations' })
    ).not.toBeInTheDocument()
  })

  it('SharedPage should not render Items section when items list is empty', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [
            mockSharedOutfit({ id: 'outfit-001', name: 'Casual Friday' }),
          ],
          locations: [],
        })
      )
    )
    renderPage()
    await screen.findByTestId('shared-page')
    expect(
      screen.queryByRole('heading', { name: 'Items' })
    ).not.toBeInTheDocument()
  })

  it('SharedPage should not show any Create or Add buttons', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: 'item-001', name: 'Shared Jacket' })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()
    await screen.findByTestId('shared-page')
    const buttons = screen.queryAllByRole('button')
    const createAddButtons = buttons.filter((btn) =>
      /create|add/i.test(btn.textContent ?? '')
    )
    expect(createAddButtons).toHaveLength(0)
  })
})
