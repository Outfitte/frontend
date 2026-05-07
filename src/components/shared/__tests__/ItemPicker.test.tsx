import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { mockItem } from '@/test/mocks/fixtures'
import { server } from '@/test/mocks/server'
import { ItemPicker } from '@/components/shared/ItemPicker'

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSelect: vi.fn(),
}

describe('ItemPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ItemPicker should not render dialog when open is false', () => {
    render(<ItemPicker {...baseProps} open={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ItemPicker should show loading skeleton while items are fetching', async () => {
    server.use(
      http.get('/api/items', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json([mockItem()])
      })
    )

    render(<ItemPicker {...baseProps} />)

    expect(screen.getByTestId('item-picker-loading')).toBeInTheDocument()
    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByTestId('item-picker-loading')).not.toBeInTheDocument()
  })

  it('ItemPicker should show item-picker-error testid when items fail to load', async () => {
    server.use(
      http.get('/api/items', () => HttpResponse.error())
    )

    render(<ItemPicker {...baseProps} />)

    await screen.findByTestId('item-picker-error')
  })

  it('ItemPicker should show item-picker-empty testid when no items match search', async () => {
    const user = userEvent.setup()
    render(<ItemPicker {...baseProps} />)

    await screen.findByText('Blue Denim Jacket')
    await user.type(screen.getByPlaceholderText('Search items…'), 'zzznomatch')

    expect(screen.getByTestId('item-picker-empty')).toBeInTheDocument()
  })

  it('ItemPicker should hide items whose ids are in excludeItemIds', async () => {
    render(<ItemPicker {...baseProps} excludeItemIds={['item-001']} />)

    await screen.findByText('Red Wool Coat')
    expect(screen.queryByText('Blue Denim Jacket')).not.toBeInTheDocument()
  })

  it('ItemPicker should not call onClose on Add click when closeOnSelect is false', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ItemPicker {...baseProps} onClose={onClose} closeOnSelect={false} />)

    await screen.findByText('Blue Denim Jacket')
    const addButtons = screen.getAllByRole('button', { name: 'Add' })
    await user.click(addButtons[0])

    expect(onClose).not.toHaveBeenCalled()
  })

  it('ItemPicker should match brand-only search against items with null brand gracefully', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Plain Shirt', brand: null }),
          mockItem({ id: 'item-002', name: 'Branded Coat', brand: 'Zara' }),
        ])
      )
    )
    const user = userEvent.setup()
    render(<ItemPicker {...baseProps} />)

    await screen.findByText('Branded Coat')
    await user.type(screen.getByPlaceholderText('Search items…'), 'zara')

    expect(screen.getByText('Branded Coat')).toBeInTheDocument()
    expect(screen.queryByText('Plain Shirt')).not.toBeInTheDocument()
  })

  it('ItemPicker should render dialog with search input and item list when open is true', async () => {
    render(<ItemPicker {...baseProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
    await screen.findByText('Blue Denim Jacket')
  })

  it('ItemPicker should list active items from useItems', async () => {
    render(<ItemPicker {...baseProps} />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByText('Red Wool Coat')).toBeInTheDocument()
  })

  it('ItemPicker should filter items by search query case-insensitively on name and brand', async () => {
    const user = userEvent.setup()
    render(<ItemPicker {...baseProps} />)

    await screen.findByText('Blue Denim Jacket')
    await user.type(screen.getByPlaceholderText('Search items…'), 'red')

    expect(screen.getByText('Red Wool Coat')).toBeInTheDocument()
    expect(screen.queryByText('Blue Denim Jacket')).not.toBeInTheDocument()
  })

  it('ItemPicker should call onSelect with the item id when Add is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ItemPicker {...baseProps} onSelect={onSelect} closeOnSelect={false} />)

    await screen.findByText('Blue Denim Jacket')
    const addButtons = screen.getAllByRole('button', { name: 'Add' })
    await user.click(addButtons[0])

    expect(onSelect).toHaveBeenCalledWith('item-001')
  })

  it('ItemPicker should call onClose when Add is clicked and closeOnSelect is true (default)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ItemPicker {...baseProps} onClose={onClose} />)

    await screen.findByText('Blue Denim Jacket')
    const addButtons = screen.getAllByRole('button', { name: 'Add' })
    await user.click(addButtons[0])

    expect(onClose).toHaveBeenCalled()
  })

  it('ItemPicker should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ItemPicker {...baseProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('ItemPicker should call onClose when dialog is dismissed via Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ItemPicker {...baseProps} onClose={onClose} />)

    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('ItemPicker should clear search when dialog is closed and reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ItemPicker {...baseProps} />)

    await screen.findByText('Blue Denim Jacket')
    await user.type(screen.getByPlaceholderText('Search items…'), 'red')
    expect(screen.queryByText('Blue Denim Jacket')).not.toBeInTheDocument()

    rerender(<ItemPicker {...baseProps} open={false} />)
    rerender(<ItemPicker {...baseProps} open={true} />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.getByPlaceholderText('Search items…')).toHaveValue('')
  })

  it('ItemPicker should render a placeholder when an item has no photos', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([mockItem({ id: 'item-001', photos: [] })])
      )
    )
    render(<ItemPicker {...baseProps} />)

    await screen.findByText('Blue Denim Jacket')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
