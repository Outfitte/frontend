import { describe, it, expect } from 'vitest'
import { screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { RegisterPage } from '@/pages/RegisterPage'
import { Route, Routes } from 'react-router'

describe('RegisterPage', () => {
  it('should show validation errors when form is submitted empty', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('should show validation error when password is shorter than 8 characters', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(
      await screen.findByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument()
  })

  it('should show validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'differentpassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument()
  })

  it('should show error message when registration fails with 409 duplicate email', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      )
    )
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(
      await screen.findByText(/email already registered/i)
    ).toBeInTheDocument()
  })

  it('should show error message when registration fails with 403 registration disabled', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          { error: 'Registration is disabled' },
          { status: 403 }
        )
      )
    )
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(
      await screen.findByText(/registration is disabled/i)
    ).toBeInTheDocument()
  })

  it('should clear previous error when form is resubmitted', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      )
    )
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    server.use(
      http.post(
        '/api/auth/register',
        () =>
          new Promise<Response>(() => {
            // never resolves — request stays in flight
          })
      )
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should render email, password, confirm password fields, register button, and sign-in link', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /register/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should disable the button with loading indicator while request is pending', async () => {
    let resolveRequest!: () => void
    server.use(
      http.post(
        '/api/auth/register',
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = () =>
              resolve(
                HttpResponse.json(
                  {
                    user: {
                      id: 'user-001',
                      email: 'alice@example.com',
                      role: 'user',
                      created_at: '2026-01-01T00:00:00Z',
                    },
                    access_token: 'access-token-abc123',
                    refresh_token: 'refresh-token-xyz789',
                  },
                  { status: 201 }
                )
              )
          })
      )
    )
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(
      await screen.findByRole('button', { name: /registering/i })
    ).toBeDisabled()

    await act(async () => {
      resolveRequest()
    })
  })

  it('should redirect to / when registration succeeds', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          {
            user: {
              id: 'user-001',
              email: 'alice@example.com',
              role: 'user',
              created_at: '2026-01-01T00:00:00Z',
            },
            access_token: 'access-token-abc123',
            refresh_token: 'refresh-token-xyz789',
          },
          { status: 201 }
        )
      )
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('should send username field (not email) in the request body', async () => {
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            user: {
              id: 'user-001',
              email: 'alice@example.com',
              role: 'user',
              created_at: '2026-01-01T00:00:00Z',
            },
            access_token: 'access-token-abc123',
            refresh_token: 'refresh-token-xyz789',
          },
          { status: 201 }
        )
      })
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    await user.type(screen.getByLabelText(/^email$/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'securepassword'
    )
    await user.click(screen.getByRole('button', { name: /register/i }))

    await screen.findByText('Dashboard')
    await waitFor(() => {
      expect(capturedBody).toEqual({
        username: 'alice@example.com',
        password: 'securepassword',
      })
    })
    expect(capturedBody).not.toHaveProperty('email')
  })
})
