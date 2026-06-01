import { http, HttpResponse } from 'msw'
import {
  mockItem,
  mockCategory,
  mockLocation,
  mockChildLocation,
  mockWearLog,
  mockPhoto,
  mockUserSummary,
  mockOutfit,
  mockOutfitLog,
  mockShareView,
  mockShare,
  mockItemTransferView,
} from './fixtures'

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
        user: {
          id: 'user-001',
          email: 'user@example.com',
          role: 'user',
          created_at: '2026-01-01T00:00:00Z',
        },
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
    const body = (await request.json()) as { registration_enabled: boolean }
    return HttpResponse.json({
      registration_enabled: body.registration_enabled,
    })
  }),

  http.get('/api/users/me', () => {
    return HttpResponse.json({
      id: 'user-001',
      email: 'user@example.com',
      role: 'user',
      created_at: '2026-01-01T00:00:00Z',
    })
  }),

  http.get('/api/users', () => {
    return HttpResponse.json([
      mockUserSummary({ id: 'user-001' }),
      mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
    ])
  }),

  // --- Items ---

  http.get('/api/items', () => {
    return HttpResponse.json([
      mockItem({ id: 'item-001' }),
      mockItem({ id: 'item-002', name: 'Red Wool Coat' }),
    ])
  }),

  http.post('/api/items', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockItem({ id: 'item-new-001', name: body['name'] as string }),
      { status: 201 }
    )
  }),

  http.get('/api/items/:id', ({ params }) => {
    return HttpResponse.json(mockItem({ id: params['id'] as string }))
  }),

  http.patch('/api/items/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(mockItem({ id: params['id'] as string, ...body }))
  }),

  http.delete('/api/items/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Item photos ---

  http.post('/api/items/:id/photos', ({ params }) => {
    return HttpResponse.json(
      mockPhoto({
        id: 'photo-new-001',
        media_key: `uploads/${params['id'] as string}/photo-new-001.jpg`,
      }),
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
      mockWearLog({
        id: 'wearlog-002',
        item_id: params['id'] as string,
        worn_on: '2026-04-11',
        notes: 'Casual day',
      }),
    ])
  }),

  http.post('/api/items/:id/wear-logs', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockWearLog({
        id: 'wearlog-new-001',
        item_id: params['id'] as string,
        worn_on: body['worn_on'] as string,
      }),
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
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockLocation({ id: 'loc-new-001', label: body['label'] as string }),
      { status: 201 }
    )
  }),

  http.get('/api/locations/:id', ({ params }) => {
    return HttpResponse.json(mockLocation({ id: params['id'] as string }))
  }),

  http.patch('/api/locations/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockLocation({ id: params['id'] as string, ...body })
    )
  }),

  http.delete('/api/locations/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch('/api/locations/:id/move', async ({ params, request }) => {
    const body = (await request.json()) as { parent_id: string | null }
    return HttpResponse.json(
      mockLocation({ id: params['id'] as string, parent_id: body.parent_id })
    )
  }),

  // --- Outfits ---

  http.get('/api/outfits', () => {
    return HttpResponse.json([
      mockOutfit({ id: 'outfit-001' }),
      mockOutfit({ id: 'outfit-002', name: 'Smart Casual' }),
    ])
  }),

  http.post('/api/outfits', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockOutfit({
        id: 'outfit-new-001',
        name: body['name'] as string,
        notes: body['notes'] as string,
      }),
      { status: 201 }
    )
  }),

  http.get('/api/outfits/:id', ({ params }) => {
    return HttpResponse.json(mockOutfit({ id: params['id'] as string }))
  }),

  http.patch('/api/outfits/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockOutfit({ id: params['id'] as string, ...body })
    )
  }),

  http.delete('/api/outfits/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Outfit items ---

  http.post('/api/outfits/:id/items', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete('/api/outfits/:id/items/:itemId', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Outfit photos ---

  http.post('/api/outfits/:id/photos', ({ params }) => {
    return HttpResponse.json(
      mockPhoto({
        id: 'photo-new-001',
        media_key: `uploads/${params['id'] as string}/photo-new-001.jpg`,
      }),
      { status: 201 }
    )
  }),

  http.delete('/api/outfits/:id/photos/:key', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Outfit logs ---

  http.get('/api/outfits/:id/logs', () => {
    return HttpResponse.json([])
  }),

  http.post('/api/outfits/:id/logs', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockOutfitLog({
        id: 'outfitlog-new-001',
        outfit_id: params['id'] as string,
        worn_on: body['worn_on'] as string,
      }),
      { status: 201 }
    )
  }),

  http.delete('/api/outfits/:id/logs/:logId', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Outfit logs (range query) ---

  http.get('/api/outfit-logs', () => {
    return HttpResponse.json([])
  }),

  // --- Shares ---

  http.get('/api/shares', () => {
    return HttpResponse.json([
      mockShareView({ id: 'share-001' }),
      mockShareView({
        id: 'share-002',
        target_type: 'outfit',
        target_id: 'outfit-001',
      }),
    ])
  }),

  http.post('/api/shares', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockShare({
        id: 'share-new-001',
        recipient_id: body['recipient_id'] as string,
        target_type: body['target_type'] as 'item' | 'outfit' | 'location',
        target_id: body['target_id'] as string,
      }),
      { status: 201 }
    )
  }),

  http.get('/api/shares/with-me', () => {
    return HttpResponse.json({
      items: [],
      outfits: [],
      locations: [],
    })
  }),

  http.delete('/api/shares/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Categories ---

  http.get('/api/categories', () => {
    return HttpResponse.json([
      mockCategory({ id: 'cat-001', label: 'Jackets' }),
      mockCategory({ id: 'cat-002', label: 'Trousers', field_hints: [] }),
    ])
  }),

  // --- Transfers ---

  http.get('/api/transfers/outgoing', () => {
    return HttpResponse.json([mockItemTransferView({ id: 'transfer-001' })])
  }),

  http.get('/api/transfers/incoming', () => {
    return HttpResponse.json([
      mockItemTransferView({
        id: 'transfer-002',
        sender_id: 'user-002',
        sender: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
        recipient_id: 'user-001',
        recipient: mockUserSummary({ id: 'user-001' }),
      }),
    ])
  }),

  http.get('/api/transfers/:id', ({ params }) => {
    return HttpResponse.json(
      mockItemTransferView({ id: params['id'] as string })
    )
  }),

  http.post('/api/transfers', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      mockItemTransferView({
        id: 'transfer-new-001',
        item: mockItem({ id: body['item_id'] as string }),
        recipient_id: body['recipient_id'] as string,
        transfer_history: body['transfer_history'] as boolean,
      }),
      { status: 201 }
    )
  }),

  http.post('/api/transfers/:id/accept', ({ params }) => {
    return HttpResponse.json(
      mockItemTransferView({
        id: params['id'] as string,
        status: 'accepted',
        decided_at: '2026-05-01T00:00:00Z',
      })
    )
  }),

  http.post('/api/transfers/:id/reject', ({ params }) => {
    return HttpResponse.json(
      mockItemTransferView({
        id: params['id'] as string,
        status: 'rejected',
        decided_at: '2026-05-01T00:00:00Z',
      })
    )
  }),

  http.post('/api/transfers/:id/cancel', ({ params }) => {
    return HttpResponse.json(
      mockItemTransferView({
        id: params['id'] as string,
        status: 'cancelled',
        decided_at: '2026-05-01T00:00:00Z',
      })
    )
  }),
]
