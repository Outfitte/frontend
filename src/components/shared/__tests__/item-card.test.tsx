import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { mockItem } from '@/test/mocks/fixtures'
import { ItemCard } from '@/components/shared/ItemCard'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

describe('ItemCard', () => {
  it('ItemCard should render locked badge with Transfer pending text when isLocked is true', () => {
    render(<ItemCard item={mockItem()} isLocked onAction={vi.fn()} />)

    expect(screen.getByTestId('item-locked-badge')).toHaveTextContent(
      'Transfer pending'
    )
  })

  it('ItemCard should not render Wore today button when isLocked is true', () => {
    render(
      <ItemCard
        item={mockItem()}
        isLocked
        onWoreToday={vi.fn()}
        onAction={vi.fn()}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Wore today' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not render context menu trigger when isLocked is true', () => {
    render(<ItemCard item={mockItem()} isLocked onAction={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'Item options' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not offer Transfer entry when isLocked is true even with onTransfer provided', () => {
    render(
      <ItemCard
        item={mockItem()}
        isLocked
        onAction={vi.fn()}
        onTransfer={vi.fn()}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Item options' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Transfer…' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not render locked badge when both isReadOnly and isLocked are true', () => {
    render(
      <ItemCard
        item={mockItem()}
        isReadOnly
        isLocked
        onAction={vi.fn()}
        onTransfer={vi.fn()}
      />
    )

    expect(screen.queryByTestId('item-locked-badge')).not.toBeInTheDocument()
  })

  it('ItemCard should not render locked badge when isLocked is not set', () => {
    render(<ItemCard item={mockItem()} onAction={vi.fn()} />)

    expect(screen.queryByTestId('item-locked-badge')).not.toBeInTheDocument()
  })

  it('ItemCard should not render Transfer entry when onTransfer is not provided', async () => {
    render(<ItemCard item={mockItem()} onAction={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))

    expect(
      screen.queryByRole('menuitem', { name: 'Transfer…' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should render Transfer entry and call onTransfer with item id when selected', async () => {
    const onTransfer = vi.fn()
    const onAction = vi.fn()
    render(
      <ItemCard item={mockItem()} onAction={onAction} onTransfer={onTransfer} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Transfer…' }))

    expect(onTransfer).toHaveBeenCalledWith('item-001')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('ItemCard should call onAction with edit and item id when Edit is selected', async () => {
    const onAction = vi.fn()
    render(<ItemCard item={mockItem()} onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(onAction).toHaveBeenCalledWith('edit', 'item-001')
  })

  it('ItemCard should call onAction with archive and item id when Archive is selected', async () => {
    const onAction = vi.fn()
    render(<ItemCard item={mockItem()} onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }))

    expect(onAction).toHaveBeenCalledWith('archive', 'item-001')
  })

  it('ItemCard should call onAction with unarchive and item id when Unarchive is selected', async () => {
    const onAction = vi.fn()
    render(<ItemCard item={mockItem()} isArchived onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unarchive' }))

    expect(onAction).toHaveBeenCalledWith('unarchive', 'item-001')
  })

  it('ItemCard should call onAction with dispose and item id when Dispose is selected', async () => {
    const onAction = vi.fn()
    render(<ItemCard item={mockItem()} onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Dispose' }))

    expect(onAction).toHaveBeenCalledWith('dispose', 'item-001')
  })

  it('ItemCard should call onAction with delete and item id when Delete is selected', async () => {
    const onAction = vi.fn()
    render(<ItemCard item={mockItem()} onAction={onAction} />)

    await userEvent.click(screen.getByRole('button', { name: 'Item options' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(onAction).toHaveBeenCalledWith('delete', 'item-001')
  })

  it('ItemCard should call onWoreToday with item id when Wore today is clicked', async () => {
    const onWoreToday = vi.fn()
    render(
      <ItemCard
        item={mockItem()}
        onWoreToday={onWoreToday}
        onAction={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Wore today' }))

    expect(onWoreToday).toHaveBeenCalledWith('item-001')
  })

  it('ItemCard should not render context menu trigger when isReadOnly is true', () => {
    render(<ItemCard item={mockItem()} isReadOnly onAction={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'Item options' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not render Wore today button when isReadOnly is true', () => {
    render(
      <ItemCard
        item={mockItem()}
        isReadOnly
        onWoreToday={vi.fn()}
        onAction={vi.fn()}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Wore today' })
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not render shared badge when sharedByEmail is set but isReadOnly is false', () => {
    render(
      <ItemCard
        item={mockItem()}
        sharedByEmail="alice@example.com"
        onAction={vi.fn()}
      />
    )

    expect(screen.queryByTestId('item-shared-badge')).not.toBeInTheDocument()
  })

  it('ItemCard should not render shared badge when isReadOnly is true but sharedByEmail is not provided', () => {
    render(<ItemCard item={mockItem()} isReadOnly onAction={vi.fn()} />)

    expect(screen.queryByTestId('item-shared-badge')).not.toBeInTheDocument()
  })

  it('ItemCard should not render disposal reason when dispose_reason is null', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'disposed', dispose_reason: null })}
        onAction={vi.fn()}
      />
    )

    expect(
      screen.queryByTestId('item-card-dispose-reason')
    ).not.toBeInTheDocument()
  })

  it('ItemCard should not render disposal reason when item is active with a non-null dispose_reason', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'active', dispose_reason: 'Donated' })}
        onAction={vi.fn()}
      />
    )

    expect(
      screen.queryByTestId('item-card-dispose-reason')
    ).not.toBeInTheDocument()
  })

  it('ItemCard should render item-shared-badge with "shared by <email>" when isReadOnly and sharedByEmail are provided', () => {
    render(
      <ItemCard
        item={mockItem()}
        isReadOnly
        sharedByEmail="alice@example.com"
        onAction={vi.fn()}
      />
    )

    expect(screen.getByTestId('item-shared-badge')).toHaveTextContent(
      'shared by alice@example.com'
    )
  })

  it('ItemCard should render context menu trigger when isReadOnly is not set', () => {
    render(<ItemCard item={mockItem()} onAction={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Item options' })
    ).toBeInTheDocument()
  })

  it('ItemCard should render Wore today button when isReadOnly is not set', () => {
    render(
      <ItemCard item={mockItem()} onWoreToday={vi.fn()} onAction={vi.fn()} />
    )

    expect(
      screen.getByRole('button', { name: 'Wore today' })
    ).toBeInTheDocument()
  })

  it('ItemCard should use /media/ path for the photo src when the item has a photo', () => {
    render(
      <ItemCard
        item={mockItem({
          photos: [
            {
              id: 'photo-001',
              media_key: 'uploads/photo-001.jpg',
              position: 0,
              created_at: '2026-01-01T00:00:00Z',
            },
          ],
        })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/media/uploads/photo-001.jpg'
    )
  })

  it('ItemCard should render dispose_reason when item is disposed with a reason', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'disposed', dispose_reason: 'Donated' })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByTestId('item-card-dispose-reason')).toHaveTextContent(
      'Donated'
    )
  })

  it('ItemCard should link to /items/:id when linkTo is not provided', () => {
    render(<ItemCard item={mockItem()} onAction={vi.fn()} />)

    expect(
      screen.getByRole('link', { name: 'View Blue Denim Jacket' })
    ).toHaveAttribute('href', '/items/item-001')
  })

  it('ItemCard should link to the linkTo prop value when linkTo is provided', () => {
    render(
      <ItemCard
        item={mockItem()}
        linkTo="/shared/items/item-001"
        onAction={vi.fn()}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View Blue Denim Jacket' })
    ).toHaveAttribute('href', '/shared/items/item-001')
  })
})
