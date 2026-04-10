import { useAuthStore } from '@/stores/authStore'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// Singleton refresh promise prevents concurrent 401s from triggering multiple refresh calls.
let inflightRefresh: Promise<void> | null = null

function buildHeaders(hasBody: boolean): Record<string, string> {
  const { token } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function parseErrorBody(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({ error: 'Unknown error' }))
  return data.error ?? 'Unknown error'
}

async function executeRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const headers = buildHeaders(body !== undefined)
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function doRefresh(): Promise<void> {
  const { refreshToken, setAuth, clearAuth } = useAuthStore.getState()

  const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!refreshResponse.ok) {
    clearAuth()
    const message = await parseErrorBody(refreshResponse)
    throw new ApiError(refreshResponse.status, message)
  }

  const data = await refreshResponse.json()
  setAuth(data.access_token, data.refresh_token)
}

async function refreshAndRetry<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!inflightRefresh) {
    inflightRefresh = doRefresh().finally(() => {
      inflightRefresh = null
    })
  }
  await inflightRefresh

  const retryResponse = await executeRequest(method, path, body)
  return parseResponse<T>(retryResponse)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await parseErrorBody(response)
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await executeRequest(method, path, body)
  } catch {
    throw new ApiError(0, 'Network error')
  }

  if (response.status === 401) {
    return refreshAndRetry<T>(method, path, body)
  }

  return parseResponse<T>(response)
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
}
