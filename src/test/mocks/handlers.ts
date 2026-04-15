import { http, HttpResponse } from 'msw'
import { mockItem, mockCategory, mockLocation, mockChildLocation, mockWearLog, mockPhoto } from './fixtures'

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

  http.get('/api/users/me', () => {
    return HttpResponse.json({
      id: 'user-001',
      email: 'user@example.com',
      role: 'user',
      created_at: '2026-01-01T00:00:00Z',
    })
  }),

  // --- Items ---

  http.get('/api/items', () => {
    return HttpResponse.json([
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
  }),

  http.post('/api/items', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      mockItem({ id: 'item-new-001', name: body['name'] as string }),
      { status: 201 }
    )
  }),

  http.get('/api/items/:id', ({ params }) => {
    return HttpResponse.json(mockItem({ id: params['id'] as string }))
  }),

  http.patch('/api/items/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(mockItem({ id: params['id'] as string, ...body }))
  }),

  http.delete('/api/items/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Item photos ---

  http.post('/api/items/:id/photos', ({ params }) => {
    return HttpResponse.json(
      mockPhoto({ id: 'photo-new-001', media_key: `uploads/${params['id'] as string}/photo-new-001.jpg` }),
      { status: 201 }
    )
  }),

  http.delete('/api/items/:id/photos/:key', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Item location assignment ---

  http.patch('/api/items/:id/location', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Item lifecycle ---

  http.post('/api/items/:id/archive', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/items/:id/unarchive', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/items/:id/dispose', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Wear logs ---

  http.get('/api/items/:id/wear-logs', ({ params }) => {
    return HttpResponse.json([
      mockWearLog({ id: 'wearlog-001', item_id: params['id'] as string }),
      mockWearLog({ id: 'wearlog-002', item_id: params['id'] as string, worn_on: '2026-04-11', notes: 'Casual day' }),
    ])
  }),

  http.post('/api/items/:id/wear-logs', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      mockWearLog({ id: 'wearlog-new-001', item_id: params['id'] as string, worn_on: body['worn_on'] as string }),
      { status: 201 }
    )
  }),

  http.delete('/api/items/:id/wear-logs/:logID', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Locations ---

  http.get('/api/locations', () => {
    return HttpResponse.json([
      mockLocation({ id: 'loc-001' }),
      mockChildLocation({ id: 'loc-002' }),
    ])
  }),

  http.post('/api/locations', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      mockLocation({ id: 'loc-new-001', label: body['label'] as string }),
      { status: 201 }
    )
  }),

  http.get('/api/locations/:id', ({ params }) => {
    return HttpResponse.json(mockLocation({ id: params['id'] as string }))
  }),

  http.patch('/api/locations/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(mockLocation({ id: params['id'] as string, ...body }))
  }),

  http.delete('/api/locations/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch('/api/locations/:id/move', async ({ params, request }) => {
    const body = await request.json() as { parent_id: string | null }
    return HttpResponse.json(mockLocation({ id: params['id'] as string, parent_id: body.parent_id }))
  }),

  // --- Categories ---

  http.get('/api/categories', () => {
    return HttpResponse.json([
      mockCategory({ id: 'cat-001', label: 'Jackets' }),
      mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
    ])
  }),
]
