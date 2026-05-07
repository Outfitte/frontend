import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { mockOutfit, mockPhoto } from '@/test/mocks/fixtures'
import { OutfitCard } from '@/components/shared/OutfitCard'

describe('OutfitCard', () => {
  it('OutfitCard should render "Untitled outfit" placeholder when name is null', () => {
    render(
      <OutfitCard outfit={mockOutfit({ name: null })} onAction={vi.fn()} />
    )

    expect(screen.getByText('Untitled outfit')).toBeInTheDocument()
  })

  it('OutfitCard should render a photo placeholder when outfit has no photos', () => {
    render(
      <OutfitCard outfit={mockOutfit({ photos: [] })} onAction={vi.fn()} />
    )

    expect(screen.getByTestId('outfit-photo-placeholder')).toBeInTheDocument()
  })

  it('OutfitCard should not render context menu when isReadOnly is true', () => {
    render(
      <OutfitCard outfit={mockOutfit()} onAction={vi.fn()} isReadOnly />
    )

    expect(screen.queryByRole('button', { name: 'Outfit options' })).not.toBeInTheDocument()
  })

  it('OutfitCard should not render shared badge when sharedByEmail is set but isReadOnly is false', () => {
    render(
      <OutfitCard outfit={mockOutfit()} onAction={vi.fn()} sharedByEmail="alice@example.com" />
    )

    expect(screen.queryByTestId('outfit-shared-badge')).not.toBeInTheDocument()
  })

  it('OutfitCard should render outfit name when set', () => {
    render(
      <OutfitCard outfit={mockOutfit({ name: 'Summer Look' })} onAction={vi.fn()} />
    )

    expect(screen.getByText('Summer Look')).toBeInTheDocument()
  })

  it('OutfitCard should render item count', () => {
    render(
      <OutfitCard
        outfit={mockOutfit({ items: [
          { outfit_id: 'outfit-001', item_id: 'item-001', position: 1 },
          { outfit_id: 'outfit-001', item_id: 'item-002', position: 2 },
          { outfit_id: 'outfit-001', item_id: 'item-003', position: 3 },
          { outfit_id: 'outfit-001', item_id: 'item-004', position: 4 },
          { outfit_id: 'outfit-001', item_id: 'item-005', position: 5 },
        ] })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByText('5 items')).toBeInTheDocument()
  })

  it('OutfitCard should render thumbnail of first photo using /media/<key> path', () => {
    render(
      <OutfitCard
        outfit={mockOutfit({ photos: [mockPhoto({ media_key: 'uploads/outfit-001.jpg' })] })}
        onAction={vi.fn()}
      />
    )

    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/uploads/outfit-001.jpg')
  })

  it('OutfitCard should wrap card in a link to /outfits/:id with accessible name View <name>', () => {
    render(
      <OutfitCard outfit={mockOutfit({ id: 'outfit-001', name: 'Casual Friday' })} onAction={vi.fn()} />
    )

    expect(screen.getByRole('link', { name: 'View Casual Friday' })).toHaveAttribute('href', '/outfits/outfit-001')
  })

  it('OutfitCard should wrap card in link using "Untitled outfit" as accessible name when name is null', () => {
    render(
      <OutfitCard outfit={mockOutfit({ id: 'outfit-002', name: null })} onAction={vi.fn()} />
    )

    expect(screen.getByRole('link', { name: 'View Untitled outfit' })).toHaveAttribute('href', '/outfits/outfit-002')
  })

  it('OutfitCard should render three-dot context menu trigger with aria-label "outfit options"', () => {
    render(
      <OutfitCard outfit={mockOutfit()} onAction={vi.fn()} />
    )

    expect(screen.getByRole('button', { name: 'Outfit options' })).toBeInTheDocument()
  })

  it('OutfitCard should show Edit, Log wear, Delete in context menu when onAction is provided', async () => {
    const user = userEvent.setup()
    render(
      <OutfitCard outfit={mockOutfit()} onAction={vi.fn()} />
    )

    await user.click(screen.getByRole('button', { name: 'Outfit options' }))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Log wear')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('OutfitCard should call onAction with "edit" and outfit id when Edit is selected', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <OutfitCard outfit={mockOutfit({ id: 'outfit-001' })} onAction={onAction} />
    )

    await user.click(screen.getByRole('button', { name: 'Outfit options' }))
    await user.click(screen.getByText('Edit'))

    expect(onAction).toHaveBeenCalledWith('edit', 'outfit-001')
  })

  it('OutfitCard should call onAction with "logWear" and outfit id when Log wear is selected', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <OutfitCard outfit={mockOutfit({ id: 'outfit-001' })} onAction={onAction} />
    )

    await user.click(screen.getByRole('button', { name: 'Outfit options' }))
    await user.click(screen.getByText('Log wear'))

    expect(onAction).toHaveBeenCalledWith('logWear', 'outfit-001')
  })

  it('OutfitCard should call onAction with "delete" and outfit id when Delete is selected', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <OutfitCard outfit={mockOutfit({ id: 'outfit-001' })} onAction={onAction} />
    )

    await user.click(screen.getByRole('button', { name: 'Outfit options' }))
    await user.click(screen.getByText('Delete'))

    expect(onAction).toHaveBeenCalledWith('delete', 'outfit-001')
  })

  it('OutfitCard should render outfit-shared-badge with "shared by <email>" when isReadOnly and sharedByEmail are provided', () => {
    render(
      <OutfitCard
        outfit={mockOutfit()}
        isReadOnly
        sharedByEmail="alice@example.com"
      />
    )

    expect(screen.getByTestId('outfit-shared-badge')).toHaveTextContent('shared by alice@example.com')
  })
})
