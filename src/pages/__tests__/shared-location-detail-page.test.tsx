import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockSharedLocation, mockItem, mockPhoto } from '@/test/mocks/fixtures'
import { SharedLocationDetailPage } from '@/pages/SharedLocationDetailPage'

const LOCATION_ID = 'loc-shared-001'
const ITEM_ID_1 = 'item-shared-001'
const ITEM_ID_2 = 'item-shared-002'

function renderPage(id = LOCATION_ID) {
  return render(
    <Routes>
      <Route
        path="/shared/locations/:id"
        element={<SharedLocationDetailPage />}
      />
    </Routes>,
    { initialEntries: [`/shared/locations/${id}`] }
  )
}

describe('SharedLocationDetailPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [],
          locations: [
            mockSharedLocation({
              location: {
                id: LOCATION_ID,
                owner_id: 'user-002',
                parent_id: null,
                label: 'Winter Wardrobe',
                created_at: '2026-01-01T00:00:00Z',
              },
              items: [
                mockItem({
                  id: ITEM_ID_1,
                  name: 'Blue Scarf',
                  photos: [
                    mockPhoto({
                      id: 'photo-001',
                      media_key: 'uploads/scarf.jpg',
                      position: 0,
                    }),
                  ],
                }),
                mockItem({
                  id: ITEM_ID_2,
                  name: 'Wool Gloves',
                  photos: [],
                }),
              ],
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
        })
      )
    )
  })

  // --- Failure / loading / 404 cases ---

  it('SharedLocationDetailPage should show 404 state when location id is not in shared-with-me results', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({ items: [], outfits: [], locations: [] })
      )
    )
    renderPage('loc-unknown')

    expect(await screen.findByText(/location not found/i)).toBeInTheDocument()
  })

  it('SharedLocationDetailPage should show loading skeleton while shared-with-me data is fetching', () => {
    server.use(
      http.get('/api/shares/with-me', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()

    expect(
      screen.getByTestId('shared-location-detail-skeleton')
    ).toBeInTheDocument()
  })

  // --- Happy path ---

  it('SharedLocationDetailPage should have data-testid shared-location-detail-page on root element', async () => {
    renderPage()

    expect(
      await screen.findByTestId('shared-location-detail-page')
    ).toBeInTheDocument()
  })

  it('SharedLocationDetailPage should render location label as heading', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Winter Wardrobe' })
    ).toBeInTheDocument()
  })

  it('SharedLocationDetailPage should render shared-by banner with sender email', async () => {
    renderPage()

    expect(await screen.findByTestId('shared-by-banner')).toHaveTextContent(
      'shared by alice@example.com'
    )
  })

  it('SharedLocationDetailPage should list items using ItemCard in read-only mode', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Winter Wardrobe' })
    const cards = screen.getAllByTestId('item-card')
    expect(cards).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: /wore today/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /item options/i })
    ).not.toBeInTheDocument()
  })

  it('SharedLocationDetailPage should link items to /shared/items/:id', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Winter Wardrobe' })
    const links = screen.getAllByRole('link', { name: /view blue scarf/i })
    expect(links[0]).toHaveAttribute('href', `/shared/items/${ITEM_ID_1}`)
  })

  it('SharedLocationDetailPage should not render Create, Move, Delete, Rename, or Share controls', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Winter Wardrobe' })
    expect(
      screen.queryByRole('button', { name: /create/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /move/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /rename/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /share/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /edit/i })
    ).not.toBeInTheDocument()
  })

  it('SharedLocationDetailPage should render empty state when location has no items', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [],
          locations: [
            mockSharedLocation({
              location: {
                id: LOCATION_ID,
                owner_id: 'user-002',
                parent_id: null,
                label: 'Empty Shelf',
                created_at: '2026-01-01T00:00:00Z',
              },
              items: [],
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
        })
      )
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Empty Shelf' })
    expect(screen.getByText(/no items/i)).toBeInTheDocument()
  })
})
