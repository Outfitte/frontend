import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/utils'
import { mockItem } from '@/test/mocks/fixtures'
import { ItemCard } from '@/components/shared/ItemCard'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

describe('ItemCard', () => {
  it('ItemCard should not render disposal reason when dispose_reason is null', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'disposed', dispose_reason: null })}
        onAction={vi.fn()}
      />
    )

    expect(screen.queryByTestId('item-card-dispose-reason')).not.toBeInTheDocument()
  })

  it('ItemCard should not render disposal reason when item is active with a non-null dispose_reason', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'active', dispose_reason: 'Donated' })}
        onAction={vi.fn()}
      />
    )

    expect(screen.queryByTestId('item-card-dispose-reason')).not.toBeInTheDocument()
  })

  it('ItemCard should render dispose_reason when item is disposed with a reason', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'disposed', dispose_reason: 'Donated' })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByTestId('item-card-dispose-reason')).toHaveTextContent('Donated')
  })

  it('ItemCard should use /media/ path for the photo src', () => {
    render(
      <ItemCard
        item={mockItem({ photos: [{ id: 'photo-001', media_key: 'uploads/photo-001.jpg', position: 0, created_at: '2026-01-01T00:00:00Z' }] })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/uploads/photo-001.jpg')
  })
})
