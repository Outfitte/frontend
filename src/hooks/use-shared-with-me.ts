import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { SharedWithMeResult } from '@/types'

export function useSharedWithMe() {
  return useQuery<SharedWithMeResult, ApiError>({
    queryKey: queryKeys.shares.withMe,
    queryFn: () => api.get<SharedWithMeResult>('/shares/with-me'),
  })
}
