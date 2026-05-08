import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { render } from '@/test/utils'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

function renderLayout(initialEntries?: string[]) {
  return render(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>dashboard content</div>} />
        <Route path="/items" element={<div>items content</div>} />
        <Route path="/items/:id" element={<div>item detail content</div>} />
        <Route path="/outfits" element={<div>outfits content</div>} />
        <Route path="/calendar" element={<div>calendar content</div>} />
        <Route path="/locations" element={<div>locations content</div>} />
        <Route path="/shared" element={<div>shared content</div>} />
        <Route path="/shares" element={<div>shares content</div>} />
        <Route path="/settings" element={<div>settings content</div>} />
      </Route>
    </Routes>,
    { initialEntries }
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'alice@example.com', role: 'user', created_at: '2024-01-01' },
      isAuthenticated: true,
      isHydrating: false,
    })
  })

  afterEach(() => {
    useThemeStore.getState().setTheme('system')
    useAuthStore.setState({ user: null, isAuthenticated: false, isHydrating: true })
  })

  it('AppLayout should show ? initials when no user is authenticated', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isHydrating: false })
    renderLayout()

    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('AppLayout should show switch to dark mode button when theme is light', () => {
    useThemeStore.getState().setTheme('light')
    renderLayout()

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('AppLayout should render app name when rendered', () => {
    renderLayout()

    expect(screen.getAllByText('Outfitte').length).toBeGreaterThan(0)
  })

  it('AppLayout should render all nav links when rendered', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /items/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /locations/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /outfits/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /shared with me/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my shares/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('AppLayout should highlight the active nav link when on its route', () => {
    renderLayout(['/items'])

    const itemsLink = screen.getByRole('link', { name: /items/i })
    expect(itemsLink).toHaveAttribute('aria-current', 'page')
  })

  it('AppLayout should set data-active true on items nav button when on items route', () => {
    renderLayout(['/items'])

    const itemsLink = screen.getByRole('link', { name: /items/i })
    expect(itemsLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on items nav button when on items sub-route', () => {
    renderLayout(['/items/item-001'])

    const itemsLink = screen.getByRole('link', { name: /items/i })
    expect(itemsLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on locations nav button when on locations route', () => {
    renderLayout(['/locations'])

    const locationsLink = screen.getByRole('link', { name: /locations/i })
    expect(locationsLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should not set data-active true on Items link when on locations route', () => {
    renderLayout(['/locations'])

    const itemsLink = screen.getByRole('link', { name: /items/i })
    expect(itemsLink).not.toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on outfits nav button when on outfits route', () => {
    renderLayout(['/outfits'])

    const outfitsLink = screen.getByRole('link', { name: /outfits/i })
    expect(outfitsLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on calendar nav button when on calendar route', () => {
    renderLayout(['/calendar'])

    const calendarLink = screen.getByRole('link', { name: /calendar/i })
    expect(calendarLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on shared nav button when on shared route', () => {
    renderLayout(['/shared'])

    const sharedLink = screen.getByRole('link', { name: /shared with me/i })
    expect(sharedLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should set data-active true on my shares nav button when on shares route', () => {
    renderLayout(['/shares'])

    const sharesLink = screen.getByRole('link', { name: /my shares/i })
    expect(sharesLink).toHaveAttribute('data-active', 'true')
  })

  it('AppLayout should navigate to /items when Items link is clicked', async () => {
    const user = userEvent.setup()
    renderLayout(['/'])

    await user.click(screen.getByRole('link', { name: /items/i }))

    expect(screen.getByText('items content')).toBeInTheDocument()
  })

  it('AppLayout should navigate to /locations when Locations link is clicked', async () => {
    const user = userEvent.setup()
    renderLayout(['/'])

    await user.click(screen.getByRole('link', { name: /locations/i }))

    expect(screen.getByText('locations content')).toBeInTheDocument()
  })

  it('AppLayout should show Settings and Log out in user dropdown when opened', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: /user menu/i }))

    expect(await screen.findByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: /log out/i })).toBeInTheDocument()
  })

  it('AppLayout should call logout when Log out is clicked', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: /user menu/i }))
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }))

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('AppLayout should render dark mode toggle button when rendered', () => {
    renderLayout()

    expect(
      screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    ).toBeInTheDocument()
  })

  it('AppLayout should switch to light mode when toggle is clicked in dark mode', async () => {
    useThemeStore.getState().setTheme('dark')
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))

    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('AppLayout should switch to dark mode when toggle is clicked in light mode', async () => {
    useThemeStore.getState().setTheme('light')
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }))

    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
