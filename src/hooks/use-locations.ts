import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Location } from '@/types'

interface CreateLocationVars {
  label: string
  parent_id?: string | null
}

interface UpdateLocationVars {
  id: string
  label: string
}

interface MoveLocationVars {
  id: string
  parent_id: string | null
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useLocations() {
  return useQuery<Location[], ApiError>({
    queryKey: queryKeys.locations.list(),
    queryFn: () => api.get<Location[]>('/locations'),
  })
}

export function useLocation(id: string) {
  return useQuery<Location, ApiError>({
    queryKey: queryKeys.locations.detail(id),
    queryFn: () => api.get<Location>(`/locations/${id}`),
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation<Location, ApiError, CreateLocationVars>({
    mutationFn: (data) => api.post<Location>('/locations', data),
    onSuccess: () => {
      toast.success('Location created')
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation<Location, ApiError, UpdateLocationVars>({
    mutationFn: ({ id, label }) => api.patch<Location>(`/locations/${id}`, { label }),
    onSuccess: (_, { id }) => {
      toast.success('Location updated')
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(id) })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/locations/${id}`),
    onSuccess: () => {
      toast.success('Location deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useMoveLocation() {
  const queryClient = useQueryClient()
  return useMutation<Location, ApiError, MoveLocationVars>({
    mutationFn: ({ id, parent_id }) =>
      api.patch<Location>(`/locations/${id}/move`, { parent_id }),
    onSuccess: () => {
      toast.success('Location moved')
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
