import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, BASE_URL } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const REFRESH_TOKEN_KEY = 'refresh_token'

interface Credentials {
  username: string
  password: string
}

interface TokenPairResponse {
  access_token: string
  refresh_token: string
}

interface RegisterResponse {
  user: User
  access_token: string
  refresh_token: string
}

async function postAuth<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({ error: 'Unknown error' }))
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Unknown error')
  return data as T
}

function showError(error: ApiError) {
  toast.error(error.message)
}

export function useLogin() {
  const { setTokens } = useAuthStore()

  return useMutation<TokenPairResponse, ApiError, Credentials>({
    mutationFn: (credentials) => postAuth<TokenPairResponse>('/auth/login', credentials),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
    },
    onError: showError,
  })
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore()

  return useMutation<RegisterResponse, ApiError, Credentials>({
    mutationFn: (credentials) => postAuth<RegisterResponse>('/auth/register', credentials),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      setUser(data.user)
    },
    onError: showError,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { refreshToken } = useAuthStore()

  return useMutation<void, ApiError>({
    mutationFn: () => postAuth<void>('/auth/logout', { refresh_token: refreshToken }),
    onSuccess: async () => {
      useAuthStore.setState({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      })
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      await queryClient.invalidateQueries()
    },
    onError: showError,
  })
}

export function useRefreshToken() {
  const { setTokens } = useAuthStore()

  return useMutation<TokenPairResponse, ApiError, { refresh_token: string }>({
    mutationFn: (vars) => postAuth<TokenPairResponse>('/auth/refresh', vars),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
    },
    onError: showError,
  })
}
