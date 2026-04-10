import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

describe('api', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
    localStorage.clear()
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

  it('api.get should throw ApiError with Unknown error message when response body is not JSON', async () => {
    server.use(
      http.get('/api/not-json', () =>
        new HttpResponse('Gateway Timeout', {
          status: 504,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
    )
    await expect(api.get('/not-json')).rejects.toMatchObject({
      status: 504,
      message: 'Unknown error',
    })
  })

  it('api.get should surface network errors as ApiError', async () => {
    server.use(
      http.get('/api/netfail', () => HttpResponse.error())
    )
    const err = await api.get('/netfail').catch((e) => e) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
  })

  it('api.get should clear auth and throw ApiError when 401 after failed refresh', async () => {
    useAuthStore.setState({
      accessToken: 'expired-token',
      refreshToken: 'bad-refresh-token',
      isAuthenticated: true,
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
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
  })

  it('api.get should make only one refresh call when two requests receive 401 simultaneously', async () => {
    let refreshCallCount = 0
    useAuthStore.setState({ accessToken: 'expired-token', refreshToken: 'valid-refresh-xyz789', isAuthenticated: true })

    server.use(
      http.get('/api/concurrent-1', ({ request }) => {
        if (request.headers.get('Authorization') === 'Bearer expired-token') {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return HttpResponse.json({ data: 'resource-1' })
      }),
      http.get('/api/concurrent-2', ({ request }) => {
        if (request.headers.get('Authorization') === 'Bearer expired-token') {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return HttpResponse.json({ data: 'resource-2' })
      }),
      http.post('/api/auth/refresh', () => {
        refreshCallCount++
        return HttpResponse.json({
          access_token: 'fresh-token-abc123',
          refresh_token: 'new-refresh-xyz789',
        })
      })
    )

    const [r1, r2] = await Promise.all([
      api.get<{ data: string }>('/concurrent-1'),
      api.get<{ data: string }>('/concurrent-2'),
    ])

    expect(refreshCallCount).toBe(1)
    expect(r1).toEqual({ data: 'resource-1' })
    expect(r2).toEqual({ data: 'resource-2' })
  })

  // --- Edge cases ---

  it('api.delete should handle 204 response without JSON parse error', async () => {
    server.use(
      http.delete('/api/items/1', () => new HttpResponse(null, { status: 204 }))
    )
    await expect(api.delete('/items/1')).resolves.toBeUndefined()
  })

  it('api.get should not attach Content-Type header when request has no body', async () => {
    let capturedContentType: string | null = null
    server.use(
      http.get('/api/check-content-type', ({ request }) => {
        capturedContentType = request.headers.get('Content-Type')
        return HttpResponse.json({ ok: true })
      })
    )
    await api.get('/check-content-type')
    expect(capturedContentType).toBeNull()
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
    useAuthStore.setState({ accessToken: 'valid-token-abc123', refreshToken: null, isAuthenticated: true })
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
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token-xyz789',
      isAuthenticated: true,
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
        const body = (await request.json()) as { refresh_token: string }
        if (body.refresh_token === 'valid-refresh-token-xyz789') {
          return HttpResponse.json({
            access_token: 'fresh-access-token-abc123',
            refresh_token: 'new-refresh-token-xyz789',
          })
        }
        return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
      })
    )

    const result = await api.get<{ secret: string }>('/protected-resource')
    expect(result).toEqual({ secret: 'data' })
    expect(requestCount).toBe(2)
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token-abc123')
  })
})
