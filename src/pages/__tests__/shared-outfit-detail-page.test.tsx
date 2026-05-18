import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockSharedOutfit,
  mockSharedItem,
  mockOutfitItem,
  mockOutfitLog,
  mockPhoto,
} from '@/test/mocks/fixtures'
import { SharedOutfitDetailPage } from '@/pages/SharedOutfitDetailPage'

const OUTFIT_ID = 'outfit-shared-001'
const ITEM_ID_SHARED = 'item-shared-001'
const ITEM_ID_UNSHARED = 'item-unshared-002'

function renderPage(id = OUTFIT_ID) {
  return render(
    <Routes>
      <Route path="/shared/outfits/:id" element={<SharedOutfitDetailPage />} />
    </Routes>,
    { initialEntries: [`/shared/outfits/${id}`] }
  )
}

describe('SharedOutfitDetailPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: ITEM_ID_SHARED,
              name: 'Shared Wool Coat',
              photos: [
                mockPhoto({
                  id: 'photo-i-001',
                  media_key: 'uploads/item-photo.jpg',
                  position: 0,
                }),
              ],
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
          outfits: [
            mockSharedOutfit({
              id: OUTFIT_ID,
              name: 'Autumn Layers',
              notes: 'Cozy fall outfit',
              items: [
                mockOutfitItem({
                  outfit_id: OUTFIT_ID,
                  item_id: ITEM_ID_SHARED,
                  position: 1,
                }),
                mockOutfitItem({
                  outfit_id: OUTFIT_ID,
                  item_id: ITEM_ID_UNSHARED,
                  position: 2,
                }),
              ],
              photos: [
                mockPhoto({
                  id: 'photo-001',
                  media_key: 'uploads/outfit-photo-001.jpg',
                  position: 0,
                }),
                mockPhoto({
                  id: 'photo-002',
                  media_key: 'uploads/outfit-photo-002.jpg',
                  position: 1,
                }),
              ],
              shared_by: { id: 'user-002', email: 'alice@example.com' },
            }),
          ],
          locations: [],
        })
      ),
      http.get('/api/outfits/:id/logs', () =>
        HttpResponse.json([
          mockOutfitLog({
            id: 'outfitlog-001',
            outfit_id: OUTFIT_ID,
            worn_on: '2026-03-15',
            notes: 'Great day',
          }),
        ])
      )
    )
  })

  // --- Failure / loading / 404 cases ---

  it('SharedOutfitDetailPage should show 404 state when outfit id is not in shared-with-me results', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({ items: [], outfits: [], locations: [] })
      )
    )
    renderPage('outfit-unknown')

    expect(await screen.findByText(/outfit not found/i)).toBeInTheDocument()
  })

  // --- Happy path ---

  it('SharedOutfitDetailPage should have data-testid shared-outfit-detail-page on root element', async () => {
    renderPage()

    expect(
      await screen.findByTestId('shared-outfit-detail-page')
    ).toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should render shared-by banner with sender email above the header', async () => {
    renderPage()

    expect(await screen.findByTestId('shared-by-banner')).toHaveTextContent(
      'shared by alice@example.com'
    )
  })

  it('SharedOutfitDetailPage should render outfit name and notes as heading', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Autumn Layers' })
    ).toBeInTheDocument()
    expect(screen.getByText('Cozy fall outfit')).toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should render photo gallery with main photo and thumbnail strip', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    expect(screen.getByTestId('outfit-photo-gallery')).toBeInTheDocument()
    expect(screen.getAllByTestId('outfit-photo-thumbnail')).toHaveLength(2)
    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      '/media/uploads/outfit-photo-001.jpg'
    )
  })

  it('SharedOutfitDetailPage should show photo placeholder when outfit has no photos', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [
            mockSharedOutfit({
              id: OUTFIT_ID,
              name: 'Autumn Layers',
              photos: [],
            }),
          ],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    expect(screen.getByTestId('outfit-photo-placeholder')).toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should link items in grid to /shared/items/:id when item is in shared-with-me list', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    const linkedItem = screen.getByTestId('outfit-item')
    expect(linkedItem.querySelector('a')).toHaveAttribute(
      'href',
      `/shared/items/${ITEM_ID_SHARED}`
    )
  })

  it('SharedOutfitDetailPage should render unclickable placeholder for items not in shared-with-me list', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    expect(screen.getByTestId('outfit-item-unlinked')).toBeInTheDocument()
    expect(
      screen.getByTestId('outfit-item-unlinked').querySelector('a')
    ).toBeNull()
  })

  it('SharedOutfitDetailPage should render wear history read-only with wear count and log entries', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    expect(await screen.findByText('Great day')).toBeInTheDocument()
    expect(screen.getByTestId('outfit-wear-count')).toHaveTextContent('1')
    expect(screen.getByTestId('outfit-last-worn')).toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should not render Edit, Delete, Share, Log wear, Add item, Remove item, photo upload, or photo delete buttons', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })

    expect(
      screen.queryByRole('link', { name: /edit/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /share/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /log wear/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add item/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /remove item/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /upload photo/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete photo/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete wear log/i })
    ).not.toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should switch to next photo when Next arrow is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-001')
    )

    await user.click(screen.getByRole('button', { name: /next photo/i }))

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )
  })

  it('SharedOutfitDetailPage should switch to previous photo when Previous arrow is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
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

  it('SharedOutfitDetailPage should switch to photo when thumbnail is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    const thumbnails = screen.getAllByTestId('outfit-photo-thumbnail')
    await user.click(thumbnails[1])

    expect(screen.getByTestId('outfit-main-photo')).toHaveAttribute(
      'src',
      expect.stringContaining('outfit-photo-002')
    )
  })

  it('SharedOutfitDetailPage should display Untitled outfit when outfit name is null', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [],
          outfits: [
            mockSharedOutfit({ id: OUTFIT_ID, name: null, photos: [] }),
          ],
          locations: [],
        })
      )
    )
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Untitled outfit' })
    ).toBeInTheDocument()
  })

  it('SharedOutfitDetailPage should render linked item with no photo as placeholder when shared item has no photos', async () => {
    server.use(
      http.get('/api/shares/with-me', () =>
        HttpResponse.json({
          items: [
            mockSharedItem({
              id: ITEM_ID_SHARED,
              name: 'Shared Coat',
              photos: [],
            }),
          ],
          outfits: [
            mockSharedOutfit({
              id: OUTFIT_ID,
              name: 'Autumn Layers',
              items: [
                mockOutfitItem({
                  outfit_id: OUTFIT_ID,
                  item_id: ITEM_ID_SHARED,
                  position: 1,
                }),
              ],
              photos: [],
            }),
          ],
          locations: [],
        })
      )
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
    const linkedItem = screen.getByTestId('outfit-item')
    expect(linkedItem).toBeInTheDocument()
    expect(linkedItem.querySelector('img')).toBeNull()
  })

  it('SharedOutfitDetailPage should wrap to last photo when Previous arrow is clicked on first photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
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

  it('SharedOutfitDetailPage should wrap to first photo when Next arrow is clicked on last photo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Autumn Layers' })
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

  it('SharedOutfitDetailPage should show loading skeleton while shared-with-me data is fetching', () => {
    server.use(
      http.get('/api/shares/with-me', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()

    expect(
      screen.getByTestId('shared-outfit-detail-skeleton')
    ).toBeInTheDocument()
  })
})
