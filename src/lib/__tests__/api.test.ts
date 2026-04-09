import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

describe('api', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null })
  })

  // --- Failure / error cases first ---

  it('api.get should throw ApiError with correct status and message when server returns 500', async () => {
    server.use(
      http.get('/api/fail500', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )
    await expect(api.get('/fail500')).rejects.toMatchObject({
      status: 500,
      message: 'Internal server error',
    })
  })

  it('api.get should throw ApiError with correct status and message when server returns 400', async () => {
    server.use(
      http.get('/api/fail400', () =>
        HttpResponse.json({ error: 'Bad request' }, { status: 400 })
      )
    )
    await expect(api.get('/fail400')).rejects.toMatchObject({
      status: 400,
      message: 'Bad request',
    })
  })

  it('api.get should throw ApiError with correct status and message when server returns 403', async () => {
    server.use(
      http.get('/api/fail403', () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })
      )
    )
    await expect(api.get('/fail403')).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    })
  })

  it('api.get should throw ApiError with correct status and message when server returns 404', async () => {
    server.use(
      http.get('/api/fail404', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })
      )
    )
    await expect(api.get('/fail404')).rejects.toMatchObject({
      status: 404,
      message: 'Not found',
    })
  })

  it('api.get should throw ApiError with correct status and message when server returns 422', async () => {
    server.use(
      http.get('/api/fail422', () =>
        HttpResponse.json({ error: 'Unprocessable entity' }, { status: 422 })
      )
    )
    await expect(api.get('/fail422')).rejects.toMatchObject({
      status: 422,
      message: 'Unprocessable entity',
    })
  })

  it('api.get should throw ApiError instance when server returns non-401 error', async () => {
    server.use(
      http.get('/api/fail503', () =>
        HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
      )
    )
    const err = await api.get('/fail503').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('api.get should surface network errors as ApiError', async () => {
    server.use(
      http.get('/api/netfail', () => HttpResponse.error())
    )
    const err = await api.get('/netfail').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
  })

  it('api.get should clear auth and throw ApiError when 401 after failed refresh', async () => {
    useAuthStore.setState({
      token: 'expired-token',
      refreshToken: 'bad-refresh-token',
    })
    server.use(
      http.get('/api/protected', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ error: 'Refresh token invalid' }, { status: 401 })
      )
    )
    await expect(api.get('/protected')).rejects.toMatchObject({
      status: 401,
    })
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  // --- Edge cases ---

  it('api.delete should handle 204 response without JSON parse error', async () => {
    server.use(
      http.delete('/api/items/1', () => new HttpResponse(null, { status: 204 }))
    )
    await expect(api.delete('/items/1')).resolves.toBeUndefined()
  })

  it('api.get should not attach Authorization header when unauthenticated', async () => {
    let capturedAuth: string | null = null
    server.use(
      http.get('/api/check-auth', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      })
    )
    await api.get('/check-auth')
    expect(capturedAuth).toBeNull()
  })

  // --- Happy path ---

  it('api.get should attach Authorization header when auth store has a token', async () => {
    useAuthStore.setState({ token: 'valid-token-abc123', refreshToken: null })
    let capturedAuth: string | null = null
    server.use(
      http.get('/api/check-auth', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      })
    )
    await api.get('/check-auth')
    expect(capturedAuth).toBe('Bearer valid-token-abc123')
  })

  it('api.get should return parsed JSON on success', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json([{ id: 'item-001', name: 'Test Item' }])
      )
    )
    const result = await api.get<{ id: string; name: string }[]>('/items')
    expect(result).toEqual([{ id: 'item-001', name: 'Test Item' }])
  })

  it('api.post should send JSON body and return parsed JSON', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post('/api/items', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'item-002', name: 'New Item' }, { status: 201 })
      })
    )
    const result = await api.post<{ id: string; name: string }>('/items', {
      name: 'New Item',
    })
    expect(capturedBody).toEqual({ name: 'New Item' })
    expect(result).toEqual({ id: 'item-002', name: 'New Item' })
  })

  it('api.patch should send JSON body and return parsed JSON', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch('/api/items/item-001', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'item-001', name: 'Updated Item' })
      })
    )
    const result = await api.patch<{ id: string; name: string }>('/items/item-001', {
      name: 'Updated Item',
    })
    expect(capturedBody).toEqual({ name: 'Updated Item' })
    expect(result).toEqual({ id: 'item-001', name: 'Updated Item' })
  })

  it('api.delete should return parsed JSON when server responds with body', async () => {
    server.use(
      http.delete('/api/items/item-001', () =>
        HttpResponse.json({ deleted: true })
      )
    )
    const result = await api.delete<{ deleted: boolean }>('/items/item-001')
    expect(result).toEqual({ deleted: true })
  })

  it('api.get should retry with new token after 401 triggers refresh', async () => {
    useAuthStore.setState({
      token: 'expired-token',
      refreshToken: 'valid-refresh-token-xyz',
    })

    let requestCount = 0
    server.use(
      http.get('/api/protected-resource', ({ request }) => {
        requestCount++
        const auth = request.headers.get('Authorization')
        if (auth === 'Bearer expired-token') {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return HttpResponse.json({ secret: 'data' })
      }),
      http.post('/api/auth/refresh', async ({ request }) => {
        const body = (await request.json()) as { refreshToken: string }
        if (body.refreshToken === 'valid-refresh-token-xyz') {
          return HttpResponse.json({
            token: 'fresh-access-token',
            refreshToken: 'new-refresh-token',
          })
        }
        return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
      })
    )

    const result = await api.get<{ secret: string }>('/protected-resource')
    expect(result).toEqual({ secret: 'data' })
    expect(requestCount).toBe(2)
    expect(useAuthStore.getState().token).toBe('fresh-access-token')
  })
})
