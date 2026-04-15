import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Category } from '@/types'

export function useCategories() {
  return useQuery<Category[], ApiError>({
    queryKey: queryKeys.categories.list(),
    queryFn: () => api.get<Category[]>('/categories'),
    // Categories are server-defined presets that don't change at runtime;
    // treat them as permanently fresh to avoid redundant re-fetches.
    staleTime: Infinity,
  })
}
