import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItem, mockWearLog, mockLocation, mockChildLocation, mockCategory, mockPhoto } from '@/test/mocks/fixtures'
import { ItemDetailPage } from '@/pages/ItemDetailPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const ITEM_ID = 'item-001'

function renderPage() {
  return render(
    <Routes>
      <Route path="/items/:id" element={<ItemDetailPage />} />
    </Routes>,
    { initialEntries: [`/items/${ITEM_ID}`] }
  )
}

describe('ItemDetailPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/items/:id', ({ params }) =>
        HttpResponse.json(
          mockItem({
            id: params['id'] as string,
            name: 'Blue Denim Jacket',
            brand: "Levi's",
            color: 'blue',
            category_id: 'cat-001',
            location_id: 'loc-002',
            purchase_price: '89.99',
            purchase_currency: 'USD',
            purchase_date: '2025-03-15',
            seller_url: 'https://example.com/jacket',
            metadata: { condition: 'good', size: 'M' },
            photos: [
              mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg', position: 0 }),
              mockPhoto({ id: 'photo-002', media_key: 'uploads/photo-002.jpg', position: 1 }),
            ],
          })
        )
      ),
      http.get('/api/items/:id/wear-logs', ({ params }) =>
        HttpResponse.json([
          mockWearLog({ id: 'wearlog-001', item_id: params['id'] as string, worn_on: '2026-04-10', notes: 'Wore to work' }),
          mockWearLog({ id: 'wearlog-002', item_id: params['id'] as string, worn_on: '2026-04-11', notes: 'Casual day' }),
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
          mockCategory({ id: 'cat-001', label: 'Jackets' }),
        ])
      )
    )
  })

  // --- Failure / loading / error cases ---

  it('ItemDetailPage should show loading skeleton while item data is fetching', () => {
    server.use(
      http.get('/api/items/:id', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    renderPage()

    expect(screen.getByTestId('item-detail-skeleton')).toBeInTheDocument()
  })

  it('ItemDetailPage should show 404 state when item is not found', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    )
    renderPage()

    expect(await screen.findByText(/item not found/i)).toBeInTheDocument()
  })

  it('ItemDetailPage should show placeholder when item has no photos', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: ITEM_ID, name: 'No Photo Item', photos: [] }))
      )
    )
    renderPage()

    await screen.findByText('No Photo Item')
    expect(screen.getByTestId('photo-placeholder')).toBeInTheDocument()
  })

  it('ItemDetailPage should hide purchase section when item has no purchase data', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: ITEM_ID,
            purchase_price: null,
            purchase_currency: null,
            purchase_date: null,
            seller_url: null,
          })
        )
      )
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByTestId('purchase-section')).not.toBeInTheDocument()
  })

  it('ItemDetailPage should show validation error when future date is entered in wear log form', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2099-12-31')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/date cannot be in the future/i)).toBeInTheDocument()
  })

  it('ItemDetailPage should send delete request when delete wear log button is clicked', async () => {
    const user = userEvent.setup()
    let deletedLogId = ''
    server.use(
      http.delete('/api/items/:id/wear-logs/:logId', ({ params }) => {
        deletedLogId = params['logId'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    // wear logs are sorted descending by worn_on, so wearlog-002 (2026-04-11) is first
    await screen.findByText('Casual day')
    await user.click(screen.getAllByRole('button', { name: /delete wear log/i })[0])

    await waitFor(() => expect(deletedLogId).toBe('wearlog-002'))
  })

  // --- Happy path ---

  it('ItemDetailPage should have data-testid item-detail-page on root element', async () => {
    renderPage()

    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('ItemDetailPage should render item name, brand, color, and category as heading and badges', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Blue Denim Jacket' })).toBeInTheDocument()
    expect(screen.getByText("Levi's")).toBeInTheDocument()
    expect(screen.getByText('blue')).toBeInTheDocument()
    expect(screen.getByText('Jackets')).toBeInTheDocument()
  })

  it('ItemDetailPage should render photo gallery with main photo and thumbnail strip', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByTestId('photo-gallery')).toBeInTheDocument()
    expect(screen.getAllByTestId('photo-thumbnail')).toHaveLength(2)
  })

  it('ItemDetailPage should switch main photo when a thumbnail is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    const thumbnails = screen.getAllByTestId('photo-thumbnail')
    await user.click(thumbnails[1])

    expect(screen.getByTestId('main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('photo-002')
    )
  })

  it('ItemDetailPage should render metadata fields as key-value pairs', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByText('condition')).toBeInTheDocument()
    expect(screen.getByText('good')).toBeInTheDocument()
    expect(screen.getByText('size')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('ItemDetailPage should render purchase section with price, currency, date, and seller URL', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByTestId('purchase-section')).toBeInTheDocument()
    expect(screen.getByText(/89\.99/)).toBeInTheDocument()
    expect(screen.getByText(/USD/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /seller/i })).toHaveAttribute(
      'href',
      'https://example.com/jacket'
    )
  })

  it('ItemDetailPage should not show location breadcrumb when item has no location', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: ITEM_ID, location_id: null }))
      )
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByTestId('location-breadcrumb')).not.toBeInTheDocument()
  })

  it('ItemDetailPage should render location as breadcrumb with ancestor chain', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    const breadcrumb = screen.getByTestId('location-breadcrumb')
    expect(breadcrumb).toHaveTextContent('Main Closet')
    expect(breadcrumb).toHaveTextContent('Top Shelf')
  })

  it('ItemDetailPage should render wear history section with list of wear logs', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(await screen.findByText('Wore to work')).toBeInTheDocument()
    expect(screen.getByText('Casual day')).toBeInTheDocument()
  })

  it('ItemDetailPage should show wear count and last worn date computed from wear logs', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await screen.findByText('Casual day')
    expect(screen.getByTestId('wear-count')).toHaveTextContent('2')
    expect(screen.getByTestId('last-worn')).toBeInTheDocument()
  })

  it('ItemDetailPage should open wear log form when Log wear button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('ItemDetailPage should close wear log form when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /log wear/i }))
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('ItemDetailPage should create wear log when form is submitted with valid date', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/items/:id/wear-logs', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          mockWearLog({ id: 'wearlog-new', worn_on: '2026-04-14' }),
          { status: 201 }
        )
      })
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-04-14')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(capturedBody).toMatchObject({ worn_on: '2026-04-14' })
    )
  })

  it('ItemDetailPage should have edit link navigating to /items/:id/edit', async () => {
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    const editLink = screen.getByRole('link', { name: /edit/i })
    expect(editLink).toHaveAttribute('href', `/items/${ITEM_ID}/edit`)
  })

  it('ItemDetailPage should send archive request when Archive button is clicked', async () => {
    const user = userEvent.setup()
    let archivedId = ''
    server.use(
      http.post('/api/items/:id/archive', ({ params }) => {
        archivedId = params['id'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /^archive$/i }))

    await waitFor(() => expect(archivedId).toBe(ITEM_ID))
  })

  it('ItemDetailPage should show Unarchive button after archiving item', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/items/:id/archive', () => new HttpResponse(null, { status: 204 }))
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /^archive$/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument()
    )
  })

  it('ItemDetailPage should send unarchive request when Unarchive button is clicked', async () => {
    const user = userEvent.setup()
    let unarchived = false
    server.use(
      http.post('/api/items/:id/archive', () => new HttpResponse(null, { status: 204 })),
      http.post('/api/items/:id/unarchive', () => {
        unarchived = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /^archive$/i }))
    await screen.findByRole('button', { name: /unarchive/i })
    await user.click(screen.getByRole('button', { name: /unarchive/i }))

    await waitFor(() => expect(unarchived).toBe(true))
  })

  it('ItemDetailPage should not show last-worn date when item has no wear logs', async () => {
    server.use(
      http.get('/api/items/:id/wear-logs', () => HttpResponse.json([]))
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByTestId('wear-count')).toHaveTextContent('0')
    expect(screen.queryByTestId('last-worn')).not.toBeInTheDocument()
  })

  it('ItemDetailPage should navigate to next photo when Next arrow button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))
  })

  it('ItemDetailPage should navigate to previous photo when Prev arrow button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))

    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))
  })

  it('ItemDetailPage should wrap to last photo when Prev is clicked on the first photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    // Start at first photo, click prev → wraps to last
    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))
  })

  it('ItemDetailPage should wrap to first photo when Next is clicked on the last photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    // Navigate to last photo, then click next → wraps to first
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-002'))

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('main-photo')).toHaveAttribute('src', expect.stringContaining('photo-001'))
  })

  it('ItemDetailPage should render purchase section when only seller URL is set', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: ITEM_ID,
            purchase_price: null,
            purchase_currency: null,
            purchase_date: null,
            seller_url: 'https://example.com/jacket',
          })
        )
      )
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByTestId('purchase-section')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /seller/i })).toBeInTheDocument()
  })

  it('ItemDetailPage should open dispose dialog with reason select when Dispose button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /dispose/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /reason/i })).toBeInTheDocument()
  })

  it('ItemDetailPage should close dispose dialog when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /dispose/i }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('ItemDetailPage should send dispose request with selected reason when dispose form is submitted', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/items/:id/dispose', async ({ request }) => {
        capturedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /dispose/i }))

    await screen.findByRole('dialog')
    await user.selectOptions(screen.getByRole('combobox', { name: /reason/i }), 'donated')
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(capturedBody).toMatchObject({ reason: 'donated' }))
  })

  it('ItemDetailPage should open delete confirmation dialog when Delete button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getAllByText(/blue denim jacket/i).length).toBeGreaterThan(0)
  })

  it('ItemDetailPage should delete item and navigate to /items after confirming delete', async () => {
    const user = userEvent.setup()
    let deletedId = ''
    server.use(
      http.delete('/api/items/:id', ({ params }) => {
        deletedId = params['id'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(deletedId).toBe(ITEM_ID))
  })
})
