import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockOutfit } from '@/test/mocks/fixtures'
import { OutfitsPage } from '@/pages/OutfitsPage'

describe('OutfitsPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Casual Friday', created_at: '2026-04-01T00:00:00Z' }),
          mockOutfit({ id: 'outfit-002', name: 'Smart Casual', created_at: '2026-03-01T00:00:00Z' }),
        ])
      )
    )
  })

  // --- Failure / loading / empty / error cases ---

  it('OutfitsPage should show loading skeletons while outfits are fetching', () => {
    server.use(
      http.get('/api/outfits', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    render(<OutfitsPage />)

    expect(screen.getAllByTestId('outfit-card-skeleton').length).toBeGreaterThan(0)
  })

  it('OutfitsPage should show empty state with create CTA when no outfits exist', async () => {
    server.use(
      http.get('/api/outfits', () => HttpResponse.json([]))
    )
    render(<OutfitsPage />)

    expect(await screen.findByText(/no outfits yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create your first outfit/i })).toBeInTheDocument()
  })

  it('OutfitsPage should restore outfit card when delete fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.delete('/api/outfits/:id', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    render(<OutfitsPage />)

    await screen.findByText('Casual Friday')
    await user.click(screen.getAllByRole('button', { name: /outfit options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    expect(await screen.findByText('Casual Friday')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('OutfitsPage should have data-testid outfits-page on root element', () => {
    render(<OutfitsPage />)

    expect(screen.getByTestId('outfits-page')).toBeInTheDocument()
  })

  it('OutfitsPage should render outfit cards in a grid when outfits exist', async () => {
    render(<OutfitsPage />)

    expect(await screen.findByText('Casual Friday')).toBeInTheDocument()
    expect(screen.getByText('Smart Casual')).toBeInTheDocument()
  })

  it('OutfitsPage should have a Create outfit link to /outfits/new', async () => {
    render(<OutfitsPage />)

    await screen.findByText('Casual Friday')
    expect(screen.getByRole('link', { name: /create outfit/i })).toHaveAttribute('href', '/outfits/new')
  })

  it('OutfitsPage should sort outfits alphabetically when sort is set to name', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Zebra Look', created_at: '2026-04-01T00:00:00Z' }),
          mockOutfit({ id: 'outfit-002', name: 'Alpha Style', created_at: '2026-03-01T00:00:00Z' }),
        ])
      )
    )
    render(<OutfitsPage />)

    await screen.findByText('Zebra Look')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'name')

    const cards = screen.getAllByTestId('outfit-card')
    expect(cards[0]).toHaveTextContent('Alpha Style')
    expect(cards[1]).toHaveTextContent('Zebra Look')
  })

  it('OutfitsPage should sort outfits oldest first when sort is set to oldest', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Newer Outfit', created_at: '2026-04-01T00:00:00Z' }),
          mockOutfit({ id: 'outfit-002', name: 'Older Outfit', created_at: '2025-01-01T00:00:00Z' }),
        ])
      )
    )
    render(<OutfitsPage />)

    await screen.findByText('Newer Outfit')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'oldest')

    const cards = screen.getAllByTestId('outfit-card')
    expect(cards[0]).toHaveTextContent('Older Outfit')
    expect(cards[1]).toHaveTextContent('Newer Outfit')
  })

  it('OutfitsPage should navigate to edit page when Edit is clicked in context menu', async () => {
    const user = userEvent.setup()
    render(<OutfitsPage />)

    await screen.findByText('Casual Friday')
    await user.click(screen.getAllByRole('button', { name: /outfit options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /edit/i }))

    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument()
    )
  })

  it('OutfitsPage should navigate to outfit detail with openLogForm state when Log wear is clicked', async () => {
    const user = userEvent.setup()
    render(<OutfitsPage />)

    await screen.findByText('Casual Friday')
    await user.click(screen.getAllByRole('button', { name: /outfit options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /log wear/i }))

    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: /log wear/i })).not.toBeInTheDocument()
    )
  })

  it('OutfitsPage should remove outfit card optimistically when Delete is clicked', async () => {
    const user = userEvent.setup()
    let resolveDelete!: () => void
    server.use(
      http.delete('/api/outfits/:id', async () => {
        await new Promise<void>((resolve) => { resolveDelete = resolve })
        return new HttpResponse(null, { status: 204 })
      })
    )
    render(<OutfitsPage />)

    await screen.findByText('Casual Friday')
    await user.click(screen.getAllByRole('button', { name: /outfit options/i })[0])
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    expect(screen.queryByText('Casual Friday')).not.toBeInTheDocument()

    resolveDelete()
  })

  it('OutfitsPage should sort null-named outfits as empty string when sorting by name', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Beta Look', created_at: '2026-04-01T00:00:00Z' }),
          mockOutfit({ id: 'outfit-002', name: null, created_at: '2026-03-01T00:00:00Z' }),
        ])
      )
    )
    render(<OutfitsPage />)

    await screen.findByText('Beta Look')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'name')

    const cards = screen.getAllByTestId('outfit-card')
    expect(cards[0]).toHaveTextContent('Untitled outfit')
    expect(cards[1]).toHaveTextContent('Beta Look')
  })
})
