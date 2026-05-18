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

export function useLocation(id: string | undefined) {
  return useQuery<Location, ApiError>({
    queryKey: queryKeys.locations.detail(id!),
    queryFn: () => api.get<Location>(`/locations/${id}`),
    enabled: !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation<Location, ApiError, CreateLocationVars>({
    mutationFn: (data) => api.post<Location>('/locations', data),
    onSuccess: () => {
      toast.success('Location created')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation<Location, ApiError, UpdateLocationVars>({
    mutationFn: ({ id, label }) =>
      api.patch<Location>(`/locations/${id}`, { label }),
    onSuccess: () => {
      toast.success('Location updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.locations.detail(id),
      })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/locations/${id}`),
    onSuccess: () => {
      toast.success('Location deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
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
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
    },
  })
}
