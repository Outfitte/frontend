import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token-abc123',
      refresh_token: 'mock-refresh-token-xyz789',
    })
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json(
      {
        user: { id: 'user-001', email: 'user@example.com', role: 'user', created_at: '2026-01-01T00:00:00Z' },
        access_token: 'mock-access-token-abc123',
        refresh_token: 'mock-refresh-token-xyz789',
      },
      { status: 201 }
    )
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/settings', () => {
    return HttpResponse.json({
      theme: 'light',
      language: 'en',
    })
  }),

  http.get('/api/admin/settings', () => {
    return HttpResponse.json({ registration_enabled: false })
  }),

  http.patch('/api/admin/settings', async ({ request }) => {
    const body = await request.json() as { registration_enabled: boolean }
    return HttpResponse.json({ registration_enabled: body.registration_enabled })
  }),
]
