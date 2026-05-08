import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockSharedItem,
  mockLocation,
  mockChildLocation,
  mockCategory,
  mockPhoto,
  mockWearLog,
} from '@/test/mocks/fixtures'
import { SharedItemDetailPage } from '@/pages/SharedItemDetailPage'

const ITEM_ID = 'item-shared-001'

function renderPage(id = ITEM_ID) {
  return render(
    <Routes>
      <Route path="/shared/items/:id" element={<SharedItemDetailPage />} />
    </Routes>,
    { initialEntries: [`/shared/items/${id}`] }
  )
}

describe('SharedItemDetailPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: ITEM_ID,
              name: 'Shared Wool Coat',
              brand: 'Burberry',
              color: 'camel',
              category_id: 'cat-001',
              location_id: 'loc-002',
              purchase_price: '499.00',
              purchase_currency: 'GBP',
              purchase_date: '2024-11-20',
              seller_url: 'https://example.com/coat',
              metadata: { material: 'wool', size: 'L' },
              photos: [
                mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg', position: 0 }),
                mockPhoto({ id: 'photo-002', media_key: 'uploads/photo-002.jpg', position: 1 }),
              ],
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
          outfits: [],
          locations: [],
        })
      ),
      http.get('/api/items/:id/wear-logs', ({ params }) =>
        HttpResponse.json([
          mockWearLog({ id: 'wearlog-001', item_id: params['id'] as string, worn_on: '2026-03-10', notes: 'Evening event' }),
        ])
      ),
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', parent_id: null, label: 'Main Closet' }),
          mockChildLocation({ id: 'loc-002', parent_id: 'loc-001', label: 'Top Shelf' }),
        ])
      ),
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({ id: 'cat-001', label: 'Coats' }),
        ])
      )
    )
  })

  // --- Failure / loading / 404 cases ---

  it('SharedItemDetailPage should show 404 state when item id is not in shared-with-me results', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({ items: [], outfits: [], locations: [] })
      )
    )
    renderPage('item-unknown')

    expect(await screen.findByText(/item not found/i)).toBeInTheDocument()
  })

  it('SharedItemDetailPage should show loading skeleton while shared-with-me data is fetching', () => {
    server.use(
      http.get('/api/shares/with-me', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()

    expect(screen.getByTestId('shared-item-detail-skeleton')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('SharedItemDetailPage should have data-testid shared-item-detail-page on root element', async () => {
    renderPage()

    expect(await screen.findByTestId('shared-item-detail-page')).toBeInTheDocument()
  })

  it('SharedItemDetailPage should render shared-by banner with sender email above the header', async () => {
    renderPage()

    expect(await screen.findByTestId('shared-by-banner')).toHaveTextContent('shared by alice@example.com')
  })

  it('SharedItemDetailPage should render item name, brand, color, and category as heading and badges', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Shared Wool Coat' })).toBeInTheDocument()
    expect(screen.getByText('Burberry')).toBeInTheDocument()
    expect(screen.getByText('camel')).toBeInTheDocument()
    expect(screen.getByText('Coats')).toBeInTheDocument()
  })

  it('SharedItemDetailPage should render photo gallery with main photo and thumbnail strip', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
    expect(screen.getAllByTestId('photo-thumbnail')).toHaveLength(2)
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', '/media/uploads/photo-001.jpg')
  })

  it('SharedItemDetailPage should render location breadcrumb with ancestor chain', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')
    const breadcrumb = screen.getByTestId('location-breadcrumb')
    expect(breadcrumb).toHaveTextContent('Main Closet')
    expect(breadcrumb).toHaveTextContent('Top Shelf')
  })

  it('SharedItemDetailPage should render metadata fields as key-value pairs', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByText('material')).toBeInTheDocument()
    expect(screen.getByText('wool')).toBeInTheDocument()
    expect(screen.getByText('size')).toBeInTheDocument()
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('SharedItemDetailPage should render purchase section with price, currency, date, and seller URL', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('purchase-section')).toBeInTheDocument()
    expect(screen.getByText(/499\.00/)).toBeInTheDocument()
    expect(screen.getByText(/GBP/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /seller/i })).toHaveAttribute('href', 'https://example.com/coat')
  })

  it('SharedItemDetailPage should render wear history read-only with wear count and log entries', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(await screen.findByText('Evening event')).toBeInTheDocument()
    expect(screen.getByTestId('wear-count')).toHaveTextContent('1')
    expect(screen.getByTestId('last-worn')).toBeInTheDocument()
  })

  it('SharedItemDetailPage should show photo placeholder when item has no photos', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: ITEM_ID, name: 'Shared Wool Coat', photos: [] })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('photo-placeholder')).toBeInTheDocument()
  })

  it('SharedItemDetailPage should not render purchase section when item has no purchase data', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: ITEM_ID,
              name: 'Shared Wool Coat',
              purchase_price: null,
              purchase_currency: null,
              purchase_date: null,
              seller_url: null,
            }),
          ],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.queryByTestId('purchase-section')).not.toBeInTheDocument()
  })

  it('SharedItemDetailPage should not show location breadcrumb when item has no location', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [mockSharedItem({ id: ITEM_ID, name: 'Shared Wool Coat', location_id: null })],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.queryByTestId('location-breadcrumb')).not.toBeInTheDocument()
  })

  it('SharedItemDetailPage should switch to next photo when Next arrow is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))
  })

  it('SharedItemDetailPage should switch to previous photo when Previous arrow is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Shared Wool Coat')
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))

    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))
  })

  it('SharedItemDetailPage should switch to photo when thumbnail is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Shared Wool Coat')
    const thumbnails = screen.getAllByTestId('photo-thumbnail')
    await user.click(thumbnails[1])

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))
  })

  it('SharedItemDetailPage should wrap to last photo when Previous arrow is clicked on first photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))

    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))
  })

  it('SharedItemDetailPage should wrap to first photo when Next arrow is clicked on last photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Shared Wool Coat')
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))
  })

  it('SharedItemDetailPage should render purchase section when only currency is set', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: ITEM_ID,
              name: 'Shared Wool Coat',
              purchase_price: null,
              purchase_currency: 'EUR',
              purchase_date: null,
              seller_url: null,
            }),
          ],
          outfits: [],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByText('Shared Wool Coat')
    expect(screen.getByTestId('purchase-section')).toBeInTheDocument()
    expect(screen.getByText(/EUR/)).toBeInTheDocument()
  })

  it('SharedItemDetailPage should not render Edit, Archive, Dispose, Delete, Share, or Log wear buttons', async () => {
    renderPage()

    await screen.findByText('Shared Wool Coat')

    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unarchive/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dispose/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log wear/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete wear log/i })).not.toBeInTheDocument()
  })
})
