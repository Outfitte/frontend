import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-token-abc123',
      user: { id: '1', email: 'user@example.com' },
    })
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
]
