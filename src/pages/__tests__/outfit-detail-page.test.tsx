import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockOutfit, mockOutfitLog, mockOutfitItem, mockItem, mockPhoto } from '@/test/mocks/fixtures'
import { OutfitDetailPage } from '@/pages/OutfitDetailPage'
import { toast } from '@/lib/toast'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const OUTFIT_ID = 'outfit-001'

function renderPage() {
  return render(
    <Routes>
      <Route path="/outfits/:id" element={<OutfitDetailPage />} />
    </Routes>,
    { initialEntries: [`/outfits/${OUTFIT_ID}`] }
  )
}

describe('OutfitDetailPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/outfits/:id', ({ params }) =>
        HttpResponse.json(
          mockOutfit({
            id: params['id'] as string,
            name: 'Casual Friday',
            notes: 'Weekend look',
            items: [],
            photos: [
              mockPhoto({ id: 'photo-001', media_key: 'uploads/outfit-photo-001.jpg', position: 0 }),
              mockPhoto({ id: 'photo-002', media_key: 'uploads/outfit-photo-002.jpg', position: 1 }),
            ],
          })
        )
      ),
      http.get('/api/outfits/:id/logs', () =>
        HttpResponse.json([
          mockOutfitLog({ id: 'outfitlog-001', outfit_id: OUTFIT_ID, worn_on: '2026-04-10', notes: 'Felt great' }),
          mockOutfitLog({ id: 'outfitlog-002', outfit_id: OUTFIT_ID, worn_on: '2026-04-11', notes: 'Second wear' }),
        ])
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket' }),
          mockItem({ id: 'item-002', name: 'White Sneakers' }),
        ])
      )
    )
  })

  // --- Loading / 404 ---

  it('OutfitDetailPage should show loading skeleton while outfit data is fetching', () => {
    server.use(
      http.get('/api/outfits/:id', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()

    expect(screen.getByTestId('outfit-detail-skeleton')).toBeInTheDocument()
  })

  it('OutfitDetailPage should show Outfit not found when outfit returns 404', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    )
    renderPage()

    expect(await screen.findByText(/outfit not found/i)).toBeInTheDocument()
  })

  it('OutfitDetailPage should stay on page when delete API returns error', async () => {
    const user = userEvent.setup()
    server.use(
      http.delete('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('OutfitDetailPage should have data-testid outfit-detail-page on root element', async () => {
    renderPage()

    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
  })

  it('OutfitDetailPage should display outfit notes when present', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: OUTFIT_ID, name: 'Casual Friday', notes: 'Weekend look' }))
      )
    )
    renderPage()

    expect(await screen.findByText('Weekend look')).toBeInTheDocument()
  })

  it('OutfitDetailPage should not display notes section when notes is null', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: OUTFIT_ID, name: 'Casual Friday', notes: null }))
      )
    )
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.queryByText('Weekend look')).not.toBeInTheDocument()
  })

  it('OutfitDetailPage should render outfit name as heading', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Casual Friday' })).toBeInTheDocument()
  })

  it('OutfitDetailPage should render Untitled outfit placeholder when name is null', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: OUTFIT_ID, name: null }))
      )
    )
    renderPage()

    expect(await screen.findByRole('heading', { name: /untitled outfit/i })).toBeInTheDocument()
  })

  it('OutfitDetailPage should have edit link navigating to /outfits/:id/edit', async () => {
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute(
      'href',
      `/outfits/${OUTFIT_ID}/edit`
    )
  })

  it('OutfitDetailPage should open confirmation AlertDialog when Delete button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('OutfitDetailPage should delete outfit and navigate to /outfits after confirming delete', async () => {
    const user = userEvent.setup()
    let deletedId = ''
    server.use(
      http.delete('/api/outfits/:id', ({ params }) => {
        deletedId = params['id'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(deletedId).toBe(OUTFIT_ID))
  })

  // --- Photos ---

  it('OutfitDetailPage should show outfit-photo-placeholder when outfit has no photos', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: OUTFIT_ID, name: 'Casual Friday', photos: [] }))
      )
    )
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByTestId('outfit-photo-placeholder')).toBeInTheDocument()
  })

  it('OutfitDetailPage should render photo gallery with main photo and thumbnail strip when outfit has photos', async () => {
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByTestId('outfit-photo-gallery')).toBeInTheDocument()
    expect(screen.getAllByTestId('outfit-photo-thumbnail')).toHaveLength(2)
  })

  it('OutfitDetailPage should switch main photo when a thumbnail is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    const thumbnails = screen.getAllByTestId('outfit-photo-thumbnail')
    await user.click(thumbnails[1])

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )
  })

  it('OutfitDetailPage should navigate to previous photo when Previous is clicked on a non-first photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )

    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-001')
    )
  })

  it('OutfitDetailPage should wrap to last photo when Previous is clicked on the first photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-001')
    )

    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )
  })

  it('OutfitDetailPage should wrap to first photo when Next is clicked on the last photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-001')
    )
  })

  // --- Items grid ---

  it('OutfitDetailPage should show No items yet when outfit has no items', async () => {
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('OutfitDetailPage should render linked item names for each outfit item', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: OUTFIT_ID,
            name: 'Casual Friday',
            items: [
              mockOutfitItem({ outfit_id: OUTFIT_ID, item_id: 'item-001', position: 0 }),
              mockOutfitItem({ outfit_id: OUTFIT_ID, item_id: 'item-002', position: 1 }),
            ],
          })
        )
      )
    )
    renderPage()

    await screen.findByText('Casual Friday')
    expect(await screen.findByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('White Sneakers')).toBeInTheDocument()
  })

  it('OutfitDetailPage should skip rendering outfit items whose id is not in the items list', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: OUTFIT_ID,
            name: 'Casual Friday',
            items: [
              mockOutfitItem({ outfit_id: OUTFIT_ID, item_id: 'item-999', position: 0 }),
            ],
          })
        )
      )
    )
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.queryByRole('link', { name: /item-999/i })).not.toBeInTheDocument()
  })

  it('OutfitDetailPage should show no-photo placeholder for items without a thumbnail', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: OUTFIT_ID,
            name: 'Casual Friday',
            items: [mockOutfitItem({ outfit_id: OUTFIT_ID, item_id: 'item-001', position: 0 })],
          })
        )
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket', photos: [] }),
        ])
      )
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByText('Blue Denim Jacket').closest('a')).toBeInTheDocument()
  })

  it('OutfitDetailPage should render item links to /items/:id', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: OUTFIT_ID,
            name: 'Casual Friday',
            items: [mockOutfitItem({ outfit_id: OUTFIT_ID, item_id: 'item-001', position: 0 })],
          })
        )
      )
    )
    renderPage()

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByRole('link', { name: /blue denim jacket/i })).toHaveAttribute(
      'href',
      '/items/item-001'
    )
  })

  // --- Wear history ---

  it('OutfitDetailPage should show validation error when future date is entered in wear log form', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2099-12-31')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/date cannot be in the future/i)).toBeInTheDocument()
  })

  it('OutfitDetailPage should render each wear log row with date and notes', async () => {
    renderPage()

    await screen.findByText('Felt great')
    expect(screen.getByText('Second wear')).toBeInTheDocument()
  })

  it('OutfitDetailPage should delete wear log when delete button is clicked on a log row', async () => {
    const user = userEvent.setup()
    let deletedLogId = ''
    server.use(
      http.delete('/api/outfits/:id/logs/:logId', ({ params }) => {
        deletedLogId = params['logId'] as string
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Second wear')
    // Logs sorted descending by date; index 0 is outfitlog-002 (2026-04-11)
    await user.click(screen.getAllByRole('button', { name: /delete wear log/i })[0])

    await waitFor(() => expect(deletedLogId).toBe('outfitlog-002'))
  })

  it('OutfitDetailPage should show wear count and last worn date above log list', async () => {
    renderPage()

    await screen.findByText('Felt great')
    expect(screen.getByTestId('outfit-wear-count')).toHaveTextContent('2')
    expect(screen.getByTestId('outfit-last-worn')).toBeInTheDocument()
  })

  it('OutfitDetailPage should not show last worn date when outfit has no wear logs', async () => {
    server.use(
      http.get('/api/outfits/:id/logs', () => HttpResponse.json([]))
    )
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByTestId('outfit-wear-count')).toHaveTextContent('0')
    expect(screen.queryByTestId('outfit-last-worn')).not.toBeInTheDocument()
  })

  it('OutfitDetailPage should open wear log form when Log wear button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('OutfitDetailPage should close wear log form when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /log wear/i }))
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('OutfitDetailPage should POST wear log with correct date and close the form on success', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('/api/outfits/:id/logs', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          mockOutfitLog({ id: 'outfitlog-new', outfit_id: OUTFIT_ID, worn_on: '2026-04-14' }),
          { status: 201 }
        )
      })
    )
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /log wear/i }))

    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-04-14')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(capturedBody).toMatchObject({ worn_on: '2026-04-14' }))
    await waitFor(() => expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument())
  })

  it('OutfitDetailPage should render Share button in header action group', async () => {
    renderPage()

    await screen.findByText('Casual Friday')
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument()
  })

  it('OutfitDetailPage should open ShareDialog when Share button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Casual Friday')
    await user.click(screen.getByRole('button', { name: /^share$/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
