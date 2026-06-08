import { describe, it, expect } from 'vitest'
import { screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { render } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { LoginPage } from '@/pages/LoginPage'
import { Route, Routes } from 'react-router'

describe('LoginPage', () => {
  it('LoginPage should show required field errors when form is submitted empty', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('LoginPage should show invalid email error when email format is wrong', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument()
  })

  it('LoginPage should show error message and not redirect when credentials are invalid', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('LoginPage should disable button with loading indicator while request is pending', async () => {
    let resolveRequest!: () => void
    server.use(
      http.post(
        '/api/auth/login',
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = () =>
              resolve(
                HttpResponse.json({
                  access_token: 'tok',
                  refresh_token: 'rtok',
                })
              )
          })
      )
    )
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(
      await screen.findByRole('button', { name: /signing in/i })
    ).toBeDisabled()

    await act(async () => {
      resolveRequest()
    })
  })

  it('LoginPage should render email field, password field, sign-in button, and register link', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('LoginPage should redirect to / when login succeeds', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      )
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('LoginPage should navigate to /register when register link is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register page</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.click(screen.getByRole('link', { name: /register/i }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('LoginPage should redirect to / when next param is an external URL', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      )
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/login?next=//evil.com'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('LoginPage should redirect to next param path when login succeeds with valid internal path', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      )
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/items" element={<div>Items page</div>} />
      </Routes>,
      { initialEntries: ['/login?next=%2Fitems'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Items page')).toBeInTheDocument()
  })

  it('LoginPage should clear previous error when form is resubmitted', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    server.use(
      http.post(
        '/api/auth/login',
        () =>
          new Promise<Response>(() => {
            // never resolves — request stays in flight
          })
      )
    )
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // error banner should be gone while new request is in flight
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('LoginPage should send email field (not username) in the request body', async () => {
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          access_token: 'access-token-abc123',
          refresh_token: 'refresh-token-xyz789',
        })
      })
    )
    const user = userEvent.setup()
    render(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await screen.findByText('Dashboard')
    await waitFor(() => {
      expect(capturedBody).toEqual({
        email: 'alice@example.com',
        password: 'secret123',
      })
    })
    expect(capturedBody).not.toHaveProperty('username')
  })
})
