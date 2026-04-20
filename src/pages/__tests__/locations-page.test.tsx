import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItem, mockLocation, mockChildLocation } from '@/test/mocks/fixtures'
import { LocationsPage } from '@/pages/LocationsPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

describe('LocationsPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet', parent_id: null }),
          mockChildLocation({ id: 'loc-002', label: 'Top Shelf', parent_id: 'loc-001' }),
        ])
      ),
      http.get('/api/items', () =>
        HttpResponse.json([
          mockItem({ id: 'item-001', name: 'Blue Denim Jacket', location_id: 'loc-001' }),
          mockItem({ id: 'item-002', name: 'Red Wool Coat', location_id: 'loc-002' }),
        ])
      )
    )
  })

  // --- Failure / loading / empty cases ---

  it('LocationsPage should show loading skeleton while locations are fetching', () => {
    server.use(
      http.get('/api/locations', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    render(<LocationsPage />)

    expect(screen.getByTestId('locations-tree-skeleton')).toBeInTheDocument()
  })

  it('LocationsPage should show empty state when no locations exist', async () => {
    server.use(
      http.get('/api/locations', () => HttpResponse.json([]))
    )
    render(<LocationsPage />)

    expect(await screen.findByText(/no locations yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create location/i })).toBeInTheDocument()
  })

  it('LocationsPage should render location tree with root locations at top level and children indented', async () => {
    render(<LocationsPage />)

    expect(await screen.findByText('Main Closet')).toBeInTheDocument()
    expect(screen.getByText('Top Shelf')).toBeInTheDocument()

    const rootNode = screen.getByTestId('tree-node-loc-001')
    const childNode = screen.getByTestId('tree-node-loc-002')
    expect(rootNode).toBeInTheDocument()
    expect(childNode).toBeInTheDocument()

    // child is indented relative to root
    const rootStyle = window.getComputedStyle(rootNode)
    const childStyle = window.getComputedStyle(childNode)
    const rootPadding = parseInt(rootStyle.paddingLeft || '0')
    const childPadding = parseInt(childStyle.paddingLeft || '0')
    expect(childPadding).toBeGreaterThan(rootPadding)
  })

  it('LocationsPage should re-expand children when expand toggle clicked twice', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('toggle-loc-001'))
    expect(screen.queryByText('Top Shelf')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-loc-001'))
    expect(screen.getByText('Top Shelf')).toBeInTheDocument()
  })

  it('LocationsPage should open and then close create dialog when create button clicked in empty state', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/locations', () => HttpResponse.json([]))
    )
    render(<LocationsPage />)

    await screen.findByText(/no locations yet/i)
    await user.click(screen.getByRole('button', { name: /create location/i }))

    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('LocationsPage should show validation error when create form submitted with empty label', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByRole('button', { name: /create location/i }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/label is required/i)).toBeInTheDocument()
  })

  it('LocationsPage should collapse children when expand toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    expect(screen.getByText('Top Shelf')).toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-loc-001'))

    expect(screen.queryByText('Top Shelf')).not.toBeInTheDocument()
  })

  it('LocationsPage should show selected location details and its items in right panel when location clicked', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('tree-node-loc-001'))

    expect(await screen.findByTestId('location-detail-panel')).toBeInTheDocument()
    expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument()
    expect(screen.queryByText('Red Wool Coat')).not.toBeInTheDocument()
  })

  it('LocationsPage should show breadcrumb ancestors in detail panel when child location is selected', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Top Shelf')
    await user.click(screen.getByTestId('tree-node-loc-002'))

    const breadcrumb = await screen.findByTestId('location-breadcrumb')
    expect(breadcrumb).toBeInTheDocument()
    expect(breadcrumb).toHaveTextContent('Main Closet')
  })

  it('LocationsPage should open create dialog with label input and parent select when create button clicked', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByRole('button', { name: /create location/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/parent/i)).toBeInTheDocument()
  })

  // --- Delete ---

  it('LocationsPage should open confirmation dialog when Delete action clicked', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })

  it('LocationsPage should delete location and close dialog on confirmation', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('LocationsPage should show 409 error message when delete fails because location has children or items', async () => {
    const user = userEvent.setup()
    server.use(
      http.delete('/api/locations/:id', () =>
        HttpResponse.json(
          { error: 'Cannot delete location with children or assigned items' },
          { status: 409 }
        )
      )
    )
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /delete/i }))

    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByText(/cannot delete location with children or assigned items/i)).toBeInTheDocument()
  })

  // --- Move ---

  it('LocationsPage should open move dialog excluding self and descendants when Move action clicked', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /move/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // self (loc-001) and its descendants (loc-002) should be disabled
    expect(screen.getByTestId('move-option-loc-001')).toBeDisabled()
    expect(screen.getByTestId('move-option-loc-002')).toBeDisabled()
  })

  it('LocationsPage should move location to root when Root option clicked in move dialog', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Top Shelf')
    await user.click(screen.getByTestId('context-menu-loc-002'))
    await user.click(screen.getByRole('menuitem', { name: /move/i }))

    await screen.findByRole('dialog')
    await user.click(screen.getByTestId('move-option-root'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('LocationsPage should call move API and close dialog when location picked in move dialog', async () => {
    const user = userEvent.setup()
    server.use(
      http.patch('/api/locations/:id/move', async ({ params, request }) => {
        const body = await request.json() as { parent_id: string | null }
        return HttpResponse.json(mockLocation({ id: params['id'] as string, parent_id: body.parent_id }))
      }),
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet', parent_id: null }),
          mockLocation({ id: 'loc-003', label: 'Spare Room', parent_id: null }),
          mockChildLocation({ id: 'loc-002', label: 'Top Shelf', parent_id: 'loc-001' }),
        ])
      )
    )
    render(<LocationsPage />)

    await screen.findByText('Top Shelf')
    await user.click(screen.getByTestId('context-menu-loc-002'))
    await user.click(screen.getByRole('menuitem', { name: /move/i }))

    await screen.findByRole('dialog')
    await user.click(screen.getByTestId('move-option-loc-003'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // --- Rename ---

  it('LocationsPage should open inline rename input when Rename action clicked in context menu', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /rename/i }))

    expect(screen.getByTestId('rename-input-loc-001')).toBeInTheDocument()
  })

  it('LocationsPage should submit rename and close inline edit when Enter pressed', async () => {
    const user = userEvent.setup()
    server.use(
      http.patch('/api/locations/:id', async ({ params, request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json(mockLocation({ id: params['id'] as string, label: body['label'] as string }))
      })
    )
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /rename/i }))

    const input = screen.getByTestId('rename-input-loc-001')
    await user.clear(input)
    await user.type(input, 'Wardrobe')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.queryByTestId('rename-input-loc-001')).not.toBeInTheDocument()
    })
  })

  it('LocationsPage should not submit rename when Enter pressed with empty input', async () => {
    const user = userEvent.setup()
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /rename/i }))

    const input = screen.getByTestId('rename-input-loc-001')
    await user.clear(input)
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('rename-input-loc-001')).toBeInTheDocument()
  })

  it('LocationsPage should cancel inline rename without saving when Escape pressed', async () => {
    const user = userEvent.setup()
    const { within } = await import('@testing-library/react')
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByTestId('context-menu-loc-001'))
    await user.click(screen.getByRole('menuitem', { name: /rename/i }))

    const input = screen.getByTestId('rename-input-loc-001')
    await user.clear(input)
    await user.type(input, 'Something else')
    await user.keyboard('{Escape}')

    expect(screen.queryByTestId('rename-input-loc-001')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('tree-node-loc-001')).getByText('Main Closet')).toBeInTheDocument()
  })

  it('LocationsPage should add created location to tree and close dialog on success', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/locations', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json(
          mockLocation({ id: 'loc-new-001', label: body['label'] as string, parent_id: null }),
          { status: 201 }
        )
      }),
      http.get('/api/locations', () =>
        HttpResponse.json([
          mockLocation({ id: 'loc-001', label: 'Main Closet', parent_id: null }),
          mockChildLocation({ id: 'loc-002', label: 'Top Shelf', parent_id: 'loc-001' }),
          mockLocation({ id: 'loc-new-001', label: 'New Drawer', parent_id: null }),
        ])
      )
    )
    render(<LocationsPage />)

    await screen.findByText('Main Closet')
    await user.click(screen.getByRole('button', { name: /create location/i }))
    await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/label/i), 'New Drawer')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText('New Drawer')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
