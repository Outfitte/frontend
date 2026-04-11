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
