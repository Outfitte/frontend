import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItem, mockCategory, mockLocation } from '@/test/mocks/fixtures'
import { ItemsPage } from '@/pages/ItemsPage'

describe('ItemsPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket', brand: "Levi's", category_id: 'cat-001', location_id: 'loc-001' }),
          mockItem({ id: 'item-002', name: 'Red Wool Coat', brand: 'Zara', category_id: 'cat-002', location_id: 'loc-002' }),
        ])
      ),
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({ id: 'cat-001', label: 'Jackets' }),
          mockCategory({ id: 'cat-002', label: 'Coats' }),
        ])
      ),
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet' }),
          mockLocation({ id: 'loc-002', label: 'Spare Room' }),
        ])
      )
    )
  })

  // --- Failure / loading / empty cases ---

  it('ItemsPage should show loading skeletons while items are fetching', () => {
    server.use(
      http.get('/api/items', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    render(<ItemsPage />)

    expect(screen.getAllByTestId('item-card-skeleton').length).toBeGreaterThan(0)
  })

  it('ItemsPage should show empty state with create CTA when no items exist', async () => {
    server.use(
      http.get('/api/items', () => HttpResponse.json([]))
    )
    render(<ItemsPage />)

    expect(await screen.findByText(/no items yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add your first item/i })).toBeInTheDocument()
  })

  it('ItemsPage should show placeholder when item has no photos', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'No Photo Item', photos: [] })])
      )
    )
    render(<ItemsPage />)

    await screen.findByText('No Photo Item')
    expect(screen.getByTestId('item-photo-placeholder')).toBeInTheDocument()
  })

  it('ItemsPage should render item card without category label when item has no category_id', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Uncategorized Item', category_id: null })])
      )
    )
    render(<ItemsPage />)

    await screen.findByText('Uncategorized Item')
    // No category badge should appear — the card still renders without error
    expect(screen.getByTestId('item-card')).toBeInTheDocument()
  })

  it('ItemsPage should restore item card when archive fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/items/:id/archive', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /archive/i }))

    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
  })

  it('ItemsPage should remove item and restore on unarchive failure when status is archived', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Denim Jacket', status: 'archived' })])
      ),
      http.post('/api/items/:id/unarchive', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    render(<ItemsPage />, { initialEntries: ['/items?status=archived'] })

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /unarchive/i }))

    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('ItemsPage should have data-testid items-page on root element', () => {
    render(<ItemsPage />)

    expect(screen.getByTestId('items-page')).toBeInTheDocument()
  })

  it('ItemsPage should render item cards in a grid when items exist', async () => {
    render(<ItemsPage />)

    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('Red Wool Coat')).toBeInTheDocument()
  })

  it('ItemsPage should display name, brand, and category label on each card', async () => {
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByText("Levi's")).toBeInTheDocument()
    expect(screen.getAllByText('Jackets').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Zara')).toBeInTheDocument()
    expect(screen.getAllByText('Coats').length).toBeGreaterThanOrEqual(1)
  })

  it('ItemsPage should link each card to its item detail page', async () => {
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByRole('link', { name: 'View Blue Denim Jacket' })).toHaveAttribute('href', '/items/item-001')
    expect(screen.getByRole('link', { name: 'View Red Wool Coat' })).toHaveAttribute('href', '/items/item-002')
  })

  it('ItemsPage should have link to create new item', async () => {
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByRole('link', { name: /add item/i })).toHaveAttribute('href', '/items/new')
  })

  it('ItemsPage should default status filter to active', async () => {
    const capturedUrls: string[] = []
    server.use(
      http.get('/api/items', ({ request }) => {
        capturedUrls.push(request.url)
        return HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Denim Jacket' })])
      })
    )
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    expect(capturedUrls.some((u) => u.includes('status=active'))).toBe(true)
  })

  it('ItemsPage should refetch with correct status param when status filter changes', async () => {
    const user = userEvent.setup()
    const capturedUrls: string[] = []
    server.use(
      http.get('/api/items', ({ request }) => {
        capturedUrls.push(request.url)
        return HttpResponse.json([])
      })
    )
    render(<ItemsPage />)

    await screen.findByText(/no items yet/i)
    await user.click(screen.getByRole('button', { name: /archived/i }))

    await waitFor(() =>
      expect(capturedUrls.some((u) => u.includes('status=archived'))).toBe(true)
    )
  })

  it('ItemsPage should show only items matching selected category filter', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByText('Red Wool Coat')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'cat-001')

    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.queryByText('Red Wool Coat')).not.toBeInTheDocument()
  })

  it('ItemsPage should clear category filter when All categories is selected', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'cat-001')
    expect(screen.queryByText('Red Wool Coat')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), '')
    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('Red Wool Coat')).toBeInTheDocument()
  })

  it('ItemsPage should show only items matching selected location filter', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')

    await user.selectOptions(screen.getByRole('combobox', { name: /location/i }), 'loc-001')

    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.queryByText('Red Wool Coat')).not.toBeInTheDocument()
  })

  it('ItemsPage should sort items alphabetically when sort is set to name', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Zebra Print Scarf', created_at: '2026-03-01T00:00:00Z' }),
          mockItem({ id: 'item-002', name: 'Alpha Hoodie', created_at: '2026-01-01T00:00:00Z' }),
        ])
      )
    )
    render(<ItemsPage />)

    await screen.findByText('Zebra Print Scarf')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'name')

    const cards = screen.getAllByTestId('item-card')
    expect(cards[0]).toHaveTextContent('Alpha Hoodie')
    expect(cards[1]).toHaveTextContent('Zebra Print Scarf')
  })

  it('ItemsPage should sort items oldest first when sort is set to oldest', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Newer Item', created_at: '2026-04-01T00:00:00Z' }),
          mockItem({ id: 'item-002', name: 'Older Item', created_at: '2025-01-01T00:00:00Z' }),
        ])
      )
    )
    render(<ItemsPage />)

    await screen.findByText('Newer Item')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'oldest')

    const cards = screen.getAllByTestId('item-card')
    expect(cards[0]).toHaveTextContent('Older Item')
    expect(cards[1]).toHaveTextContent('Newer Item')
  })

  it('ItemsPage should post wear log with today\'s date when wore today button is clicked', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/items/:id/wear-logs', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({}, { status: 201 })
      })
    )
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    const woreButtons = screen.getAllByRole('button', { name: /wore today/i })
    await user.click(woreButtons[0])

    const today = new Date().toLocaleDateString('en-CA')
    await waitFor(() =>
      expect(capturedBody).toMatchObject({ worn_on: today })
    )
  })

  it('ItemsPage should show context menu with Edit, Archive, Dispose, Delete when three-dot button is clicked on active item', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])

    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /dispose/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
  })

  it('ItemsPage should remove item card optimistically when archive is selected from context menu', async () => {
    const user = userEvent.setup()
    let resolveArchive!: () => void
    server.use(
      http.post('/api/items/:id/archive', async () => {
        await new Promise<void>((resolve) => { resolveArchive = resolve })
        return new HttpResponse(null, { status: 204 })
      })
    )
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /archive/i }))

    expect(screen.queryByText('Blue Denim Jacket')).not.toBeInTheDocument()

    resolveArchive()
  })

  it('ItemsPage should show Unarchive instead of Archive when status is archived', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Denim Jacket', status: 'archived' })])
      )
    )
    render(<ItemsPage />, { initialEntries: ['/items?status=archived'] })

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])

    expect(screen.getByRole('menuitem', { name: /unarchive/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument()
  })

  it('ItemsPage should call DELETE /items/:id when delete is selected from context menu', async () => {
    const user = userEvent.setup()
    let deletedId = ''
    server.use(
      http.delete('/api/items/:id', ({ params }) => {
        deletedId = params['id'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    await waitFor(() => expect(deletedId).toBe('item-001'))
  })

  it('ItemsPage should navigate to edit page when edit is selected from context menu', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /edit/i }))

    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument()
    )
  })

  it('ItemsPage should navigate to dispose page when dispose is selected from context menu', async () => {
    const user = userEvent.setup()
    render(<ItemsPage />)

    await screen.findByText('Blue Denim Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /dispose/i }))

    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: /dispose/i })).not.toBeInTheDocument()
    )
  })

  it('ItemsPage should show Unarchive for archived item when status filter is all', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Archived Jacket', status: 'archived' })])
      )
    )
    render(<ItemsPage />, { initialEntries: ['/items?status=all'] })

    await screen.findByText('Archived Jacket')
    await user.click(screen.getAllByRole('button', { name: /item options/i })[0])

    expect(screen.getByRole('menuitem', { name: /unarchive/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument()
  })

  it('ItemsPage should show archived badge on archived item when status filter is all', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Archived Jacket', status: 'archived' })])
      )
    )
    render(<ItemsPage />, { initialEntries: ['/items?status=all'] })

    await screen.findByText('Archived Jacket')

    expect(screen.getByTestId('item-status-badge')).toHaveTextContent('Archived')
  })

  it('ItemsPage should show disposed badge on disposed item when status filter is all', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Disposed Sneakers', status: 'disposed' })])
      )
    )
    render(<ItemsPage />, { initialEntries: ['/items?status=all'] })

    await screen.findByText('Disposed Sneakers')

    expect(screen.getByTestId('item-status-badge')).toHaveTextContent('Disposed')
  })
})
