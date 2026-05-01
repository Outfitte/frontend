import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { ApiError, BASE_URL, api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { User, TokenPair } from '@/types'

const REFRESH_TOKEN_KEY = 'refresh_token'

interface Credentials {
  username: string
  password: string
}

interface RegisterResponse extends TokenPair {
  user: User
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

function clearAuthState() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  })
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function showError(error: ApiError) {
  toast.error(error.message)
}

async function fetchMe(): Promise<User | null> {
  return api.get<User>('/users/me').catch(() => null)
}

export function useLogin(options?: { onSuccess?: () => void }) {
  const { setTokens, setUser } = useAuthStore()

  return useMutation<TokenPair, ApiError, Credentials>({
    mutationFn: (credentials) => postAuth<TokenPair>('/auth/login', credentials),
    onSuccess: async (data) => {
      setTokens(data.access_token, data.refresh_token)
      const user = await fetchMe()
      if (user) setUser(user)
      options?.onSuccess?.()
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
      clearAuthState()
      await queryClient.invalidateQueries()
    },
    onError: (error) => {
      clearAuthState()
      showError(error)
    },
  })
}

export function useRefreshToken() {
  const { setTokens } = useAuthStore()

  return useMutation<TokenPair, ApiError, { refresh_token: string }>({
    mutationFn: (vars) => postAuth<TokenPair>('/auth/refresh', vars),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
    },
  })
}
