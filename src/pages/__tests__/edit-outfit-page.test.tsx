import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockOutfit, mockOutfitItem, mockItem, mockPhoto } from '@/test/mocks/fixtures'
import { EditOutfitPage } from '@/pages/EditOutfitPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage(id = 'outfit-001') {
  return render(
    <Routes>
      <Route path="/outfits/:id/edit" element={<EditOutfitPage />} />
      <Route path="/outfits/:id" element={<div data-testid="outfit-detail-page" />} />
    </Routes>,
    { initialEntries: [`/outfits/${id}/edit`] }
  )
}

describe('EditOutfitPage', () => {
  // --- Loading / error cases ---

  it('EditOutfitPage should show loading skeleton while fetching outfit', () => {
    server.use(
      http.get('/api/outfits/:id', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    renderPage()

    expect(screen.getByTestId('edit-outfit-skeleton')).toBeInTheDocument()
  })

  it('EditOutfitPage should show 404 state when outfit is not found', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    )
    renderPage()

    expect(await screen.findByText(/outfit not found/i)).toBeInTheDocument()
  })

  it('EditOutfitPage should show toast error and stay on page when update fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', notes: 'Weekend' }))
      ),
      http.patch('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('edit-outfit-page')).toBeInTheDocument()
  })

  it('EditOutfitPage should show empty inputs when outfit name and notes are null', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: null, notes: null }))
      )
    )
    renderPage()

    await screen.findByTestId('edit-outfit-page')
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
    expect(screen.getByLabelText(/notes/i)).toHaveValue('')
  })

  it('EditOutfitPage should pre-populate name and notes from existing outfit', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', notes: 'Weekend look' }))
      )
    )
    renderPage()

    expect(await screen.findByDisplayValue('Casual Friday')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Weekend look')).toBeInTheDocument()
  })

  it('EditOutfitPage should send null for cleared name and notes in PATCH', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', notes: 'Weekend look' }))
      ),
      http.patch('/api/outfits/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockOutfit({ id: 'outfit-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.clear(screen.getByLabelText(/name/i))
    await user.clear(screen.getByLabelText(/notes/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(patchBody['name']).toBeNull()
      expect(patchBody['notes']).toBeNull()
    })
  })

  it('EditOutfitPage should call useUpdateOutfit and navigate to outfit detail on save', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday' }))
      ),
      http.patch('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001' }))
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
  })

  it('EditOutfitPage should navigate back to outfit detail when Cancel is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday' }))
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
  })

  // --- Items section ---

  it('EditOutfitPage should show toast error when adding item fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', items: [] }))
      ),
      http.post('/api/outfits/:id/items', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      ),
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Jacket' })])
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(await screen.findByRole('button', { name: /add/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('EditOutfitPage should show toast error when removing item fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            items: [mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-001' })],
          })
        )
      ),
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Jacket' })])
      ),
      http.delete('/api/outfits/:id/items/:itemId', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await screen.findByText('Blue Jacket')
    await user.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('EditOutfitPage should list current outfit items with thumbnail and name', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            items: [
              mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-001' }),
              mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-002', position: 2 }),
            ],
          })
        )
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Jacket', photos: [mockPhoto({ media_key: 'uploads/jacket.jpg' })] }),
          mockItem({ id: 'item-002', name: 'White Tee', photos: [] }),
        ])
      )
    )
    renderPage()

    expect(await screen.findByText('Blue Jacket')).toBeInTheDocument()
    expect(screen.getByText('White Tee')).toBeInTheDocument()
    expect(screen.getByAltText('Blue Jacket')).toBeInTheDocument()
  })

  it('EditOutfitPage should open ItemPicker when Add item button is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', items: [] }))
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('EditOutfitPage should call useAddOutfitItem and show item in list when selected from picker', async () => {
    const user = userEvent.setup()
    let addCalled = false
    server.use(
      http.get('/api/outfits/:id', () => {
        if (addCalled) {
          return HttpResponse.json(
            mockOutfit({
              id: 'outfit-001',
              name: 'Casual Friday',
              items: [mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-001' })],
            })
          )
        }
        return HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', items: [] }))
      }),
      http.post('/api/outfits/:id/items', () => {
        addCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Jacket' })])
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(await screen.findByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(addCalled).toBe(true))
    expect(await screen.findByText('Blue Jacket')).toBeInTheDocument()
  })

  it('EditOutfitPage should call useRemoveOutfitItem and remove item when Remove is clicked', async () => {
    const user = userEvent.setup()
    let removeCalled = false
    server.use(
      http.get('/api/outfits/:id', () => {
        if (removeCalled) {
          return HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', items: [] }))
        }
        return HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            items: [mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-001' })],
          })
        )
      }),
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', name: 'Blue Jacket' })])
      ),
      http.delete('/api/outfits/:id/items/:itemId', () => {
        removeCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await screen.findByText('Blue Jacket')
    await user.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(removeCalled).toBe(true))
    await waitFor(() => expect(screen.queryByText('Blue Jacket')).not.toBeInTheDocument())
  })

  it('EditOutfitPage should exclude items already in the outfit from ItemPicker', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            items: [mockOutfitItem({ outfit_id: 'outfit-001', item_id: 'item-001' })],
          })
        )
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Jacket' }),
          mockItem({ id: 'item-002', name: 'White Tee' }),
        ])
      )
    )
    renderPage()

    await screen.findByDisplayValue('Casual Friday')
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await screen.findByRole('dialog')

    expect(screen.queryByRole('button', { name: /^add$/i, hidden: false })).toBeInTheDocument()
    const addButtons = screen.queryAllByRole('button', { name: /^add$/i })
    expect(addButtons).toHaveLength(1)
  })

  // --- Photos section ---

  it('EditOutfitPage should show existing photos with delete buttons', async () => {
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            photos: [
              mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' }),
              mockPhoto({ id: 'photo-002', media_key: 'uploads/photo-002.jpg' }),
            ],
          })
        )
      )
    )
    renderPage()

    await screen.findByTestId('edit-outfit-page')
    expect(screen.getByRole('button', { name: /delete photo photo-001/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete photo photo-002/i })).toBeInTheDocument()
  })

  it('EditOutfitPage should call useDeleteOutfitPhoto and remove photo from view when delete is clicked', async () => {
    const deletedKeys: string[] = []
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(
          mockOutfit({
            id: 'outfit-001',
            name: 'Casual Friday',
            photos: [mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' })],
          })
        )
      ),
      http.delete('/api/outfits/:id/photos/:key', ({ params }) => {
        deletedKeys.push(params['key'] as string)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('button', { name: /delete photo photo-001/i })
    await user.click(screen.getByRole('button', { name: /delete photo photo-001/i }))

    await waitFor(() => expect(deletedKeys.length).toBe(1))
    expect(screen.queryByRole('button', { name: /delete photo photo-001/i })).not.toBeInTheDocument()
  })

  it('EditOutfitPage should show queued photo preview when file input is used', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', photos: [] }))
      )
    )
    renderPage()

    await screen.findByTestId('edit-outfit-page')
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)

    expect(await screen.findByAltText(/photo 1/i)).toBeInTheDocument()
  })

  it('EditOutfitPage should upload queued photos sequentially on Save Changes', async () => {
    const uploadedIds: string[] = []
    server.use(
      http.get('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001', name: 'Casual Friday', photos: [] }))
      ),
      http.patch('/api/outfits/:id', () =>
        HttpResponse.json(mockOutfit({ id: 'outfit-001' }))
      ),
      http.post('/api/outfits/:id/photos', ({ params }) => {
        uploadedIds.push(params['id'] as string)
        return HttpResponse.json(
          mockPhoto({ id: 'photo-new-001', media_key: 'uploads/new.jpg' }),
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByTestId('edit-outfit-page')
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(uploadedIds).toContain('outfit-001'))
  })
})
