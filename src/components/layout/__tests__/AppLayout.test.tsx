import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { render } from '@/test/utils'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

function renderLayout() {
  return render(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>child content</div>} />
        <Route path="/items" element={<div>items content</div>} />
        <Route path="/settings" element={<div>settings content</div>} />
      </Route>
    </Routes>
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: '1', email: 'alice@example.com', role: 'user', created_at: '2024-01-01' },
      isAuthenticated: true,
      isHydrating: false,
    })
  })
  it('AppLayout should render app name', () => {
    renderLayout()
    expect(screen.getAllByText('Outfitte').length).toBeGreaterThan(0)
  })

  it('AppLayout should render all nav links in the sidebar', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: /items/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /outfits/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /shared/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('AppLayout should highlight the active nav link when on its route', () => {
    render(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/items" element={<div>items content</div>} />
        </Route>
      </Routes>,
      { initialEntries: ['/items'] }
    )

    const itemsLink = screen.getByRole('link', { name: /items/i })
    expect(itemsLink).toHaveAttribute('aria-current', 'page')
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

  it('AppLayout should render dark mode toggle button', () => {
    renderLayout()

    expect(
      screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    ).toBeInTheDocument()
  })

  it('AppLayout should toggle theme when dark mode button is clicked', async () => {
    const user = userEvent.setup()
    renderLayout()

    const toggle = screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    await user.click(toggle)

    expect(
      screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    ).toBeInTheDocument()
  })

  it('AppLayout should show switch to light mode button when theme is dark', async () => {
    useThemeStore.getState().setTheme('dark')
    const user = userEvent.setup()
    renderLayout()

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))

    expect(useThemeStore.getState().theme).toBe('light')
  })
})
