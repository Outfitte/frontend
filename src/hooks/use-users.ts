import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { User, UserSummary } from '@/types'

export function useUsers() {
  return useQuery<UserSummary[], ApiError>({
    queryKey: queryKeys.users.list(),
    queryFn: () => api.get<UserSummary[]>('/users'),
  })
}

export function useMe() {
  return useQuery<User, ApiError>({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/users/me'),
  })
}
