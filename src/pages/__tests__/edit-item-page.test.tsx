import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItem, mockCategory, mockPhoto } from '@/test/mocks/fixtures'
import { EditItemPage } from '@/pages/EditItemPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage(id = 'item-001') {
  return render(
    <Routes>
      <Route path="/items/:id/edit" element={<EditItemPage />} />
      <Route
        path="/items/:id"
        element={<div data-testid="item-detail-page" />}
      />
    </Routes>,
    { initialEntries: [`/items/${id}/edit`] }
  )
}

describe('EditItemPage', () => {
  // --- Failure / error / loading cases ---

  it('EditItemPage should show loading skeleton while fetching item', () => {
    server.use(
      http.get('/api/items/:id', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    renderPage()

    expect(screen.getByTestId('edit-item-skeleton')).toBeInTheDocument()
  })

  it('EditItemPage should show 404 state when item is not found', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    )
    renderPage()

    expect(await screen.findByText(/item not found/i)).toBeInTheDocument()
  })

  it('EditItemPage should have data-testid edit-item-page on root element', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', name: 'Blue Jacket' }))
      )
    )
    renderPage()

    expect(await screen.findByTestId('edit-item-page')).toBeInTheDocument()
  })

  it('EditItemPage should pre-populate form with existing item data on load', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            name: 'Blue Denim Jacket',
            brand: "Levi's",
            color: 'blue',
            purchase_price: '89.99',
            purchase_currency: 'USD',
            purchase_date: '2025-03-15',
            seller_url: 'https://example.com/jacket',
          })
        )
      )
    )
    renderPage()

    expect(
      await screen.findByDisplayValue('Blue Denim Jacket')
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue("Levi's")).toBeInTheDocument()
    expect(screen.getByDisplayValue('blue')).toBeInTheDocument()
    expect(screen.getByDisplayValue('89.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('USD')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-03-15')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('https://example.com/jacket')
    ).toBeInTheDocument()
  })

  it('EditItemPage should show validation error when name is cleared on submit', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', name: 'Blue Jacket' }))
      )
    )
    renderPage()

    const nameInput = await screen.findByDisplayValue('Blue Jacket')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('EditItemPage should clear currency when price is cleared', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            purchase_price: '89.99',
            purchase_currency: 'USD',
          })
        )
      )
    )
    renderPage()

    await screen.findByDisplayValue('89.99')
    const priceInput = screen.getByLabelText(/price/i)
    await user.clear(priceInput)

    await waitFor(() =>
      expect(screen.getByLabelText(/currency/i)).toHaveValue('')
    )
  })

  it('EditItemPage should allow category to be changed or cleared', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', category_id: 'cat-001' }))
      ),
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({ id: 'cat-001', label: 'Jackets', field_hints: [] }),
          mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
        ])
      )
    )
    renderPage()

    await screen.findByDisplayValue('Blue Denim Jacket')
    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      ''
    )

    expect(screen.getByRole('combobox', { name: /category/i })).toHaveValue('')
  })

  it('EditItemPage should pre-populate metadata user rows from existing item metadata', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            metadata: { material: 'cotton', fit: 'slim' },
            category_id: null,
          })
        )
      )
    )
    renderPage()

    await screen.findByDisplayValue('Blue Denim Jacket')
    expect(screen.getByDisplayValue('material')).toBeInTheDocument()
    expect(screen.getByDisplayValue('cotton')).toBeInTheDocument()
    expect(screen.getByDisplayValue('fit')).toBeInTheDocument()
    expect(screen.getByDisplayValue('slim')).toBeInTheDocument()
  })

  it('EditItemPage should include empty metadata value in patch (sends empty string to delete key)', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            metadata: { material: 'cotton' },
            category_id: null,
          })
        )
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue('cotton')
    const valueInput = screen.getByDisplayValue('cotton')
    await user.clear(valueInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(
        (patchBody['metadata'] as Record<string, string>)?.['material']
      ).toBe('')
    )
  })

  it('EditItemPage should preserve existing metadata keys when new fields are added', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            metadata: { material: 'cotton' },
            category_id: null,
          })
        )
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue('cotton')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    const valueInputs = screen.getAllByPlaceholderText(/value/i)
    await user.type(keyInputs[keyInputs.length - 1], 'brand')
    await user.type(valueInputs[valueInputs.length - 1], 'Nike')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      const meta = patchBody['metadata'] as Record<string, string>
      expect(meta?.['material']).toBe('cotton')
      expect(meta?.['brand']).toBe('Nike')
    })
  })

  it('EditItemPage should show existing photos with delete buttons', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            photos: [
              mockPhoto({
                id: 'photo-001',
                media_key: 'uploads/photo-001.jpg',
              }),
              mockPhoto({
                id: 'photo-002',
                media_key: 'uploads/photo-002.jpg',
              }),
            ],
          })
        )
      )
    )
    renderPage()

    await screen.findByTestId('edit-item-page')
    expect(
      screen.getByRole('button', { name: /delete photo photo-001/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /delete photo photo-002/i })
    ).toBeInTheDocument()
  })

  it('EditItemPage should send DELETE request and remove photo from view when delete button clicked', async () => {
    const deletedKeys: string[] = []
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            photos: [
              mockPhoto({
                id: 'photo-001',
                media_key: 'uploads/photo-001.jpg',
              }),
            ],
          })
        )
      ),
      http.delete('/api/items/:id/photos/:key', ({ params }) => {
        deletedKeys.push(params['key'] as string)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('button', { name: /delete photo photo-001/i })
    await user.click(
      screen.getByRole('button', { name: /delete photo photo-001/i })
    )

    await waitFor(() => expect(deletedKeys.length).toBe(1))
    expect(
      screen.queryByRole('button', { name: /delete photo photo-001/i })
    ).not.toBeInTheDocument()
  })

  it('EditItemPage should allow new photos to be added and upload them on submission', async () => {
    const uploadedItemIds: string[] = []
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', photos: [] }))
      ),
      http.patch('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001' }))
      ),
      http.post('/api/items/:id/photos', ({ params }) => {
        uploadedItemIds.push(params['id'] as string)
        return HttpResponse.json(
          mockPhoto({ id: 'photo-new-001', media_key: 'uploads/new.jpg' }),
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByTestId('edit-item-page')
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/staged upload 1/i)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(uploadedItemIds).toContain('item-001'))
  })

  it('EditItemPage should navigate to item detail page on successful update', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', name: 'Blue Jacket' }))
      ),
      http.patch('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001' }))
      )
    )
    renderPage()

    await screen.findByDisplayValue('Blue Jacket')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('EditItemPage should navigate back to item detail page when Cancel is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', name: 'Blue Jacket' }))
      )
    )
    renderPage()

    await screen.findByDisplayValue('Blue Jacket')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('EditItemPage should split metadata keys matching category hints into hint rows', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            category_id: 'cat-001',
            metadata: { condition: 'excellent', material: 'cotton' },
          })
        )
      ),
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              {
                key: 'condition',
                label: 'Condition',
                placeholder: 'e.g. good',
              },
            ],
          }),
        ])
      )
    )
    renderPage()

    // hint key 'condition' should appear in a readonly hint input, non-hint 'material' in user row
    await screen.findByDisplayValue('Blue Denim Jacket')
    expect(screen.getByDisplayValue('excellent')).toBeInTheDocument()
    // 'material' should appear as a user row (editable key input)
    expect(screen.getByDisplayValue('material')).toBeInTheDocument()
    expect(screen.getByDisplayValue('cotton')).toBeInTheDocument()
  })

  it('EditItemPage should send null for cleared optional fields in patch body', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            name: 'Blue Jacket',
            brand: "Levi's",
            color: 'blue',
            seller_url: 'https://example.com',
          })
        )
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue("Levi's")
    await user.clear(screen.getByLabelText(/^brand/i))
    await user.clear(screen.getByLabelText(/^color/i))
    await user.clear(screen.getByLabelText(/seller url/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(patchBody['brand']).toBeNull()
      expect(patchBody['color']).toBeNull()
      expect(patchBody['seller_url']).toBeNull()
    })
  })

  it('EditItemPage should skip metadata rows with empty key on submit', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({ id: 'item-001', metadata: {}, category_id: null })
        )
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByTestId('edit-item-page')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    // leave key empty, only type value
    const valueInputs = screen.getAllByPlaceholderText(/value/i)
    await user.type(valueInputs[valueInputs.length - 1], 'cotton')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(
        Object.keys((patchBody['metadata'] as Record<string, string>) ?? {})
      ).toHaveLength(0)
    )
  })

  it('EditItemPage should send empty string for hint with no value in edit mode', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            category_id: 'cat-001',
            metadata: {},
          })
        )
      ),
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              {
                key: 'condition',
                label: 'Condition',
                placeholder: 'e.g. good',
              },
            ],
          }),
        ])
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue('Blue Denim Jacket')
    // leave hint value empty and submit
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(
        (patchBody['metadata'] as Record<string, string>)?.['condition']
      ).toBe('')
    )
  })

  it('EditItemPage should default optional fields to empty string when item fields are null', async () => {
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            name: 'Minimal Item',
            brand: null,
            color: null,
            category_id: null,
            location_id: null,
            purchase_price: null,
            purchase_currency: null,
            purchase_date: null,
            seller_url: null,
            metadata: {},
          })
        )
      )
    )
    renderPage()

    await screen.findByDisplayValue('Minimal Item')
    expect(screen.getByLabelText(/^brand/i)).toHaveValue('')
    expect(screen.getByLabelText(/^color/i)).toHaveValue('')
  })

  it('EditItemPage should send null for cleared price, currency, location, and date', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> = {}
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(
          mockItem({
            id: 'item-001',
            name: 'Blue Jacket',
            location_id: 'loc-001',
            purchase_price: '89.99',
            purchase_currency: 'USD',
            purchase_date: '2025-03-15',
          })
        )
      ),
      http.patch('/api/items/:id', async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockItem({ id: 'item-001' }))
      })
    )
    renderPage()

    await screen.findByDisplayValue('89.99')
    await user.selectOptions(
      screen.getByRole('combobox', { name: /location/i }),
      ''
    )
    await user.clear(screen.getByLabelText(/price/i))
    await user.clear(screen.getByLabelText(/purchase date/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(patchBody['location_id']).toBeNull()
      expect(patchBody['purchase_price']).toBeNull()
      expect(patchBody['purchase_currency']).toBeNull()
      expect(patchBody['purchase_date']).toBeNull()
    })
  })

  it('EditItemPage should show toast error and stay on form when update fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.get('/api/items/:id', () =>
        HttpResponse.json(mockItem({ id: 'item-001', name: 'Blue Jacket' }))
      ),
      http.patch('/api/items/:id', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await screen.findByDisplayValue('Blue Jacket')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('edit-item-page')).toBeInTheDocument()
  })
})
