import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { ItemForm } from '@/components/shared/ItemForm'
import type { ItemFormPayload } from '@/components/shared/ItemForm'
import { mockPhoto, mockCategory } from '@/test/mocks/fixtures'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const noop = vi.fn()

function renderCreate(overrides: Partial<React.ComponentProps<typeof ItemForm>> = {}) {
  return render(
    <ItemForm
      mode="create"
      onSave={vi.fn()}
      onCancel={noop}
      {...overrides}
    />
  )
}

function renderEdit(overrides: Partial<React.ComponentProps<typeof ItemForm>> = {}) {
  return render(
    <ItemForm
      mode="edit"
      defaultValues={{
        name: 'Blue Denim Jacket',
        brand: "Levi's",
        category_id: '',
        color: 'blue',
        location_id: '',
        purchase_price: '89.99',
        purchase_currency: 'USD',
        purchase_date: '2025-03-15',
        seller_url: 'https://example.com/jacket',
        metadata: [],
      }}
      onSave={vi.fn()}
      onCancel={noop}
      {...overrides}
    />
  )
}

describe('ItemForm', () => {
  beforeEach(() => {
    noop.mockReset()
  })

  // --- Failure / validation cases ---

  it('ItemForm should show validation error when name is empty in create mode', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('ItemForm should show validation error when name is empty in edit mode', async () => {
    const user = userEvent.setup()
    renderEdit()

    const nameInput = await screen.findByDisplayValue('Blue Denim Jacket')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('ItemForm should show validation error when price is set without currency in create mode', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(screen.getByLabelText(/^name/i), 'Jacket')
    await user.type(screen.getByLabelText(/price/i), '49.99')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/both price and currency are required/i)).toBeInTheDocument()
  })

  it('ItemForm should show validation error when price is set without currency in edit mode', async () => {
    const user = userEvent.setup()
    renderEdit()

    await screen.findByDisplayValue('Blue Denim Jacket')
    await user.clear(screen.getByLabelText(/currency/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/both price and currency are required/i)).toBeInTheDocument()
  })

  it('ItemForm should show validation error when currency code has more than 3 characters in create mode', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(screen.getByLabelText(/^name/i), 'Jacket')
    await user.type(screen.getByLabelText(/price/i), '49.99')
    await user.type(screen.getByLabelText(/currency/i), 'USDX')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/enter a 3-letter currency code/i)).toBeInTheDocument()
  })

  // --- Happy path ---

  it('ItemForm should render all sections when mode is create with empty defaults', () => {
    renderCreate()

    expect(screen.getByRole('heading', { name: /basic info/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^purchase$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /custom fields/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^photos$/i })).toBeInTheDocument()
  })

  it('ItemForm should render all sections when mode is edit with pre-populated values', async () => {
    renderEdit()

    await screen.findByDisplayValue('Blue Denim Jacket')
    expect(screen.getByRole('heading', { name: /basic info/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^purchase$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /custom fields/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^photos$/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.getByDisplayValue("Levi's")).toBeInTheDocument()
    expect(screen.getByDisplayValue('89.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('USD')).toBeInTheDocument()
  })

  it('ItemForm should update field hints when category is changed', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              { key: 'condition', label: 'Condition', placeholder: 'e.g. new, good, worn' },
              { key: 'size', label: 'Size', placeholder: 'e.g. S, M, L' },
            ],
          }),
        ])
      )
    )
    renderCreate()

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'cat-001')

    expect(await screen.findByDisplayValue('condition')).toBeInTheDocument()
    expect(screen.getByDisplayValue('size')).toBeInTheDocument()
  })

  it('ItemForm should clear field hints when category is deselected', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              { key: 'condition', label: 'Condition', placeholder: 'e.g. new, good, worn' },
            ],
          }),
        ])
      )
    )
    renderCreate()

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'cat-001')
    await screen.findByDisplayValue('condition')

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), '')

    expect(screen.queryByDisplayValue('condition')).not.toBeInTheDocument()
  })

  it('ItemForm should add a metadata row when Add Field is clicked in create mode', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: /add field/i }))

    expect(screen.getAllByPlaceholderText(/^key$/i).length).toBeGreaterThan(0)
  })

  it('ItemForm should add a metadata row when Add Field is clicked in edit mode', async () => {
    const user = userEvent.setup()
    renderEdit()

    await screen.findByDisplayValue('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /add field/i }))

    expect(screen.getAllByPlaceholderText(/^key$/i).length).toBeGreaterThan(0)
  })

  it('ItemForm should remove a metadata row when its Remove button is clicked in create mode', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    expect(screen.getAllByPlaceholderText(/^key$/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /remove field/i }))

    expect(screen.queryAllByPlaceholderText(/^key$/i).length).toBe(0)
  })

  it('ItemForm should remove a metadata row when its Remove button is clicked in edit mode', async () => {
    const user = userEvent.setup()
    renderEdit({
      defaultValues: {
        name: 'Blue Denim Jacket',
        metadata: [{ key: 'material', value: 'cotton' }],
      },
    })

    await screen.findByDisplayValue('Blue Denim Jacket')
    expect(screen.getByDisplayValue('material')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove field/i }))

    expect(screen.queryByDisplayValue('material')).not.toBeInTheDocument()
  })

  it('ItemForm should show photo preview for newly queued files', async () => {
    const user = userEvent.setup()
    renderCreate()

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)

    expect(await screen.findByAltText(/photo 1/i)).toBeInTheDocument()
  })

  it('ItemForm should use /media/ path for existing photo src when item has photos', async () => {
    renderEdit({
      existingPhotos: [mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' })],
      itemId: 'item-001',
    })

    const img = await screen.findByAltText('Existing photo photo-001')
    expect(img).toHaveAttribute('src', '/media/uploads/photo-001.jpg')
  })

  it('ItemForm should render existing photos with delete buttons in edit mode', async () => {
    renderEdit({
      existingPhotos: [
        mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' }),
        mockPhoto({ id: 'photo-002', media_key: 'uploads/photo-002.jpg' }),
      ],
      itemId: 'item-001',
    })

    expect(await screen.findByRole('button', { name: /delete photo photo-001/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete photo photo-002/i })).toBeInTheDocument()
  })

  it('ItemForm should remove a queued photo from preview when its Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderCreate()

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.click(screen.getByRole('button', { name: /remove photo 1/i }))

    expect(screen.queryByAltText(/photo 1/i)).not.toBeInTheDocument()
  })

  it('ItemForm should not call delete API when itemId is absent and delete button is clicked', async () => {
    const deletedKeys: string[] = []
    server.use(
      http.delete('/api/items/:id/photos/:key', ({ params }) => {
        deletedKeys.push(params['key'] as string)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    renderEdit({
      existingPhotos: [mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' })],
      // no itemId provided
    })

    await screen.findByRole('button', { name: /delete photo photo-001/i })
    await user.click(screen.getByRole('button', { name: /delete photo photo-001/i }))

    // The button remains visible because the no-op guard leaves the photo in place
    expect(screen.getByRole('button', { name: /delete photo photo-001/i })).toBeInTheDocument()
    expect(deletedKeys.length).toBe(0)
  })

  it('ItemForm should delete existing photo via API and remove it from view', async () => {
    const deletedKeys: string[] = []
    server.use(
      http.delete('/api/items/:id/photos/:key', ({ params }) => {
        deletedKeys.push(params['key'] as string)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    renderEdit({
      existingPhotos: [mockPhoto({ id: 'photo-001', media_key: 'uploads/photo-001.jpg' })],
      itemId: 'item-001',
    })

    await screen.findByRole('button', { name: /delete photo photo-001/i })
    await user.click(screen.getByRole('button', { name: /delete photo photo-001/i }))

    await vi.waitFor(() => expect(deletedKeys.length).toBe(1))
    expect(screen.queryByRole('button', { name: /delete photo photo-001/i })).not.toBeInTheDocument()
  })

  it('ItemForm should fire onCancel callback when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderCreate({ onCancel })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('ItemForm should call onSave with correct payload shape when form is submitted in create mode', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderCreate({ onSave })

    await user.type(screen.getByLabelText(/^name/i), 'My Jacket')
    await user.type(screen.getByLabelText(/^brand/i), 'Nike')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledOnce())

    const [payload, photos] = onSave.mock.calls[0] as [ItemFormPayload, File[]]
    expect(payload.name).toBe('My Jacket')
    expect(payload.brand).toBe('Nike')
    expect(payload.metadata).toEqual({})
    expect(photos).toEqual([])
  })

  it('ItemForm should call onSave with correct payload shape when form is submitted in edit mode', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderEdit({ onSave })

    await screen.findByDisplayValue('Blue Denim Jacket')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledOnce())

    const [payload, photos] = onSave.mock.calls[0] as [ItemFormPayload, File[]]
    expect(payload.name).toBe('Blue Denim Jacket')
    expect(payload.brand).toBe("Levi's")
    expect(payload.metadata).toEqual({})
    expect(photos).toEqual([])
  })

  it('ItemForm should include queued photos in onSave callback', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderCreate({ onSave })

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.type(screen.getByLabelText(/^name/i), 'My Jacket')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledOnce())

    const [, photos] = onSave.mock.calls[0] as [ItemFormPayload, File[]]
    expect(photos).toHaveLength(1)
    expect(photos[0].name).toBe('photo.jpg')
  })
})
