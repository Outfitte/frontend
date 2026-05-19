import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import {
  mockCategory,
  mockLocation,
  mockChildLocation,
} from '@/test/mocks/fixtures'
import { CreateItemPage } from '@/pages/CreateItemPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage() {
  return render(
    <Routes>
      <Route path="/items/new" element={<CreateItemPage />} />
      <Route path="/items" element={<div data-testid="items-page" />} />
      <Route
        path="/items/:id"
        element={<div data-testid="item-detail-page" />}
      />
    </Routes>,
    { initialEntries: ['/items/new'] }
  )
}

describe('CreateItemPage', () => {
  // --- Failure / error cases ---

  it('CreateItemPage should show validation error when name is empty on submit', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when price is not a valid number', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/price/i), 'abc')
    await user.type(screen.getByLabelText(/currency/i), 'USD')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/enter a valid price/i)).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when currency is not 3 letters', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/price/i), '49.99')
    await user.type(screen.getByLabelText(/currency/i), 'US')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/enter a 3-letter currency code/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when seller url is not a valid URL', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/seller url/i), 'not-a-url')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/enter a valid url/i)).toBeInTheDocument()
  })

  it('CreateItemPage should navigate to detail page even if photo upload fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/items', () =>
        HttpResponse.json({ id: 'item-new-001', name: 'Test' }, { status: 201 })
      ),
      http.post('/api/items/:id/photos', () =>
        HttpResponse.json({ error: 'Upload failed' }, { status: 500 })
      )
    )
    renderPage()

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when price is set without currency', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/price/i), '49.99')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/both price and currency are required/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when currency is set without price', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/currency/i), 'USD')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/both price and currency are required/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when purchase date is in the future', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.type(screen.getByLabelText(/purchase date/i), '2099-12-31')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/purchase date cannot be in the future/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when metadata key exceeds 64 characters', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    await user.type(keyInputs[keyInputs.length - 1], 'a'.repeat(65))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/key must be 64 characters or fewer/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when metadata key has leading spaces', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    await user.type(keyInputs[keyInputs.length - 1], ' leading')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/key must not have leading or trailing spaces/i)
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show validation error when metadata key contains invalid characters', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    await user.type(keyInputs[keyInputs.length - 1], 'invalid-key!')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(
        /key may only contain letters, numbers, and spaces/i
      )
    ).toBeInTheDocument()
  })

  it('CreateItemPage should show toast error and stay on form when item creation fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.post('/api/items', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test Item')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('create-item-page')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('CreateItemPage should have data-testid create-item-page on root element', () => {
    renderPage()

    expect(screen.getByTestId('create-item-page')).toBeInTheDocument()
  })

  it('CreateItemPage should render all four sections: Basic Info, Purchase, Custom Fields, Photos', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /basic info/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^purchase$/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /custom fields/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^photos$/i })
    ).toBeInTheDocument()
  })

  it('CreateItemPage should populate category dropdown from GET /categories', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({ id: 'cat-001', label: 'Jackets' }),
          mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
        ])
      )
    )
    renderPage()

    expect(
      await screen.findByRole('option', { name: 'Jackets' })
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Trousers' })).toBeInTheDocument()
  })

  it('CreateItemPage should show field hint rows when a category with hints is selected', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json([
          mockCategory({
            id: 'cat-001',
            label: 'Jackets',
            field_hints: [
              {
                key: 'condition',
                label: 'Condition',
                placeholder: 'e.g. new, good, worn',
              },
              { key: 'size', label: 'Size', placeholder: 'e.g. S, M, L' },
            ],
          }),
        ])
      )
    )
    renderPage()

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      'cat-001'
    )

    expect(await screen.findByDisplayValue('condition')).toBeInTheDocument()
    expect(screen.getByDisplayValue('size')).toBeInTheDocument()
  })

  it('CreateItemPage should populate location dropdown from GET /locations with indented hierarchy', async () => {
    server.use(
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({
            id: 'loc-001',
            label: 'Main Closet',
            parent_id: null,
          }),
          mockChildLocation({
            id: 'loc-002',
            label: 'Top Shelf',
            parent_id: 'loc-001',
          }),
        ])
      )
    )
    renderPage()

    const topShelfOption = await screen.findByRole('option', {
      name: /top shelf/i,
    })
    expect(topShelfOption.textContent).toMatch(/—/)
  })

  it('CreateItemPage should normalise currency to uppercase as user types', async () => {
    const user = userEvent.setup()
    renderPage()

    const currencyInput = screen.getByLabelText(/currency/i)
    await user.type(currencyInput, 'usd')

    expect(currencyInput).toHaveValue('USD')
  })

  it('CreateItemPage should add a new metadata row when Add Field button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add field/i }))

    expect(screen.getAllByPlaceholderText(/key/i).length).toBeGreaterThan(0)
  })

  it('CreateItemPage should remove a metadata row when its Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    expect(keyInputs.length).toBeGreaterThan(0)

    await user.click(
      screen.getAllByRole('button', { name: /remove field/i })[0]
    )

    expect(screen.queryAllByPlaceholderText(/key/i).length).toBe(0)
  })

  it('CreateItemPage should show photo preview after selecting a file', async () => {
    const user = userEvent.setup()
    renderPage()

    const file = new File(['photo-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)

    expect(await screen.findByAltText(/photo 1/i)).toBeInTheDocument()
  })

  it('CreateItemPage should queue multiple photos before submission', async () => {
    const user = userEvent.setup()
    renderPage()

    const file1 = new File(['bytes1'], 'photo1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['bytes2'], 'photo2.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, [file1, file2])

    expect(await screen.findByAltText(/photo 1/i)).toBeInTheDocument()
    expect(screen.getByAltText(/photo 2/i)).toBeInTheDocument()
  })

  it('CreateItemPage should remove a queued photo when its remove button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.click(screen.getByRole('button', { name: /remove photo 1/i }))

    expect(screen.queryByAltText(/photo 1/i)).not.toBeInTheDocument()
  })

  it('CreateItemPage should create item and navigate to detail page on successful submission', async () => {
    const user = userEvent.setup()
    let createdBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/items', async ({ request }) => {
        createdBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: createdBody['name'] as string },
          { status: 201 }
        )
      })
    )
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'My New Jacket')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(createdBody['name']).toBe('My New Jacket'))
    expect(await screen.findByTestId('item-detail-page')).toBeInTheDocument()
  })

  it('CreateItemPage should upload queued photos sequentially after successful item creation', async () => {
    const user = userEvent.setup()
    const uploadedItemIds: string[] = []
    server.use(
      http.post('/api/items', () =>
        HttpResponse.json({ id: 'item-new-001', name: 'Test' }, { status: 201 })
      ),
      http.post('/api/items/:id/photos', ({ params }) => {
        uploadedItemIds.push(params['id'] as string)
        return HttpResponse.json(
          {
            id: 'photo-new-001',
            media_key: 'uploads/photo.jpg',
            position: 0,
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 }
        )
      })
    )
    renderPage()

    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/add photos/i)
    await user.upload(input, file)
    await screen.findByAltText(/photo 1/i)

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(uploadedItemIds).toContain('item-new-001'))
  })

  it('CreateItemPage should include seller_url in submission when filled', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/items', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: 'Test' },
          { status: 201 }
        )
      })
    )
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.type(
      screen.getByLabelText(/seller url/i),
      'https://example.com/jacket'
    )
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(capturedBody['seller_url']).toBe('https://example.com/jacket')
    )
  })

  it('CreateItemPage should navigate to /items when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByTestId('items-page')).toBeInTheDocument()
  })

  it('CreateItemPage should exclude metadata rows with empty values from submission', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/items', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: 'Test' },
          { status: 201 }
        )
      })
    )
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    await user.type(keyInputs[keyInputs.length - 1], 'material')
    // leave value empty → should be excluded
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(capturedBody['name']).toBe('Test'))
    const metadata = capturedBody['metadata'] as
      | Record<string, string>
      | undefined
    expect(metadata?.['material']).toBeUndefined()
  })

  it('CreateItemPage should include user metadata row with both key and value in submission', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/items', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: 'Test' },
          { status: 201 }
        )
      })
    )
    renderPage()

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /add field/i }))
    const keyInputs = screen.getAllByPlaceholderText(/key/i)
    const valueInputs = screen.getAllByPlaceholderText(/value/i)
    await user.type(keyInputs[keyInputs.length - 1], 'material')
    await user.type(valueInputs[valueInputs.length - 1], 'cotton')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(
        (capturedBody['metadata'] as Record<string, string>)?.['material']
      ).toBe('cotton')
    )
  })

  it('CreateItemPage should clear hint rows when category is deselected', async () => {
    const user = userEvent.setup()
    server.use(
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

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      'cat-001'
    )
    await screen.findByDisplayValue('condition')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      ''
    )

    expect(screen.queryByDisplayValue('condition')).not.toBeInTheDocument()
  })

  it('CreateItemPage should omit hint metadata when hint value is empty on submission', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
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
      http.post('/api/items', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: 'Test' },
          { status: 201 }
        )
      })
    )
    renderPage()

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      'cat-001'
    )
    await screen.findByDisplayValue('condition')
    // leave hint value empty

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(capturedBody['name']).toBe('Test'))
    expect(capturedBody['metadata']).toBeUndefined()
  })

  it('CreateItemPage should include hint value in submission when hint value is typed', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
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
      http.post('/api/items', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { id: 'item-new-001', name: 'Test' },
          { status: 201 }
        )
      })
    )
    renderPage()

    await screen.findByRole('option', { name: 'Jackets' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      'cat-001'
    )

    await screen.findByDisplayValue('condition')
    // type into the hint value input (the one after the readonly key)
    const hintValueInput = screen.getByPlaceholderText('e.g. good')
    await user.type(hintValueInput, 'excellent')

    await user.type(screen.getByLabelText(/^name/i), 'Test')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(
        (capturedBody['metadata'] as Record<string, string>)?.['condition']
      ).toBe('excellent')
    )
  })
})
