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

    expect(screen.queryByTestId('item-dispose-reason')).not.toBeInTheDocument()
  })

  it('ItemCard should render dispose_reason when item is disposed with a reason', () => {
    render(
      <ItemCard
        item={mockItem({ status: 'disposed', dispose_reason: 'Donated' })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByTestId('item-dispose-reason')).toHaveTextContent('Donated')
  })
})
