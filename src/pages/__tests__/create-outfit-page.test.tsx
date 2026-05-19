import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { CreateOutfitPage } from '@/pages/CreateOutfitPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage() {
  return render(
    <Routes>
      <Route path="/outfits/new" element={<CreateOutfitPage />} />
      <Route path="/outfits" element={<div data-testid="outfits-page" />} />
      <Route
        path="/outfits/:id/edit"
        element={<div data-testid="edit-outfit-page" />}
      />
    </Routes>,
    { initialEntries: ['/outfits/new'] }
  )
}

describe('CreateOutfitPage', () => {
  // --- Failure / error cases ---

  it('CreateOutfitPage should show toast error and stay on form when create fails', async () => {
    const { toast } = await import('@/lib/toast')
    const user = userEvent.setup()
    server.use(
      http.post('/api/outfits', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    )
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'My Outfit')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('create-outfit-page')).toBeInTheDocument()
  })

  it('CreateOutfitPage should show validation error when name exceeds 200 characters', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'a'.repeat(201))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByText(/200 characters or fewer/i)
    ).toBeInTheDocument()
    expect(screen.getByTestId('create-outfit-page')).toBeInTheDocument()
  })

  // --- Happy path ---

  it('CreateOutfitPage should have data-testid create-outfit-page on root element', () => {
    renderPage()

    expect(screen.getByTestId('create-outfit-page')).toBeInTheDocument()
  })

  it('CreateOutfitPage should render name input, notes textarea, Save and Cancel buttons', () => {
    renderPage()

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('CreateOutfitPage should navigate to /outfits when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByTestId('outfits-page')).toBeInTheDocument()
  })

  it('CreateOutfitPage should succeed and navigate to edit page when saved with empty name', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByTestId('edit-outfit-page')).toBeInTheDocument()
  })

  it('CreateOutfitPage should create outfit and navigate to /outfits/:id/edit on successful submission', async () => {
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/outfits', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            id: 'outfit-new-001',
            name: capturedBody['name'] as string,
            notes: capturedBody['notes'],
            items: [],
            photos: [],
            owner_id: 'user-001',
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 }
        )
      })
    )
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'Summer Look')
    await user.type(screen.getByLabelText(/notes/i), 'Light and breezy')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(capturedBody['name']).toBe('Summer Look'))
    expect(await screen.findByTestId('edit-outfit-page')).toBeInTheDocument()
  })
})
