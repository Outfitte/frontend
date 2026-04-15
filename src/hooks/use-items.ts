import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Item } from '@/types'

type DisposeReason = 'donated' | 'sold' | 'discarded' | 'lost' | 'other'

interface DisposeVars {
  id: string
  reason: DisposeReason
}

interface AssignLocationVars {
  id: string
  location_id: string | null
}

interface UpdateItemVars {
  id: string
  data: Partial<Item>
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useItems(status?: string) {
  return useQuery<Item[], ApiError>({
    queryKey: queryKeys.items.list(status),
    queryFn: () => {
      const path = status ? `/items?status=${status}` : '/items'
      return api.get<Item[]>(path)
    },
  })
}

export function useItem(id: string) {
  return useQuery<Item, ApiError>({
    queryKey: queryKeys.items.detail(id),
    queryFn: () => api.get<Item>(`/items/${id}`),
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation<Item, ApiError, Record<string, unknown>>({
    mutationFn: (data) => api.post<Item>('/items', data),
    onSuccess: () => {
      toast.success('Item created')
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation<Item, ApiError, UpdateItemVars>({
    mutationFn: ({ id, data }) => api.patch<Item>(`/items/${id}`, data),
    onSuccess: (_, { id }) => {
      toast.success('Item updated')
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/items/${id}`),
    onSuccess: () => {
      toast.success('Item deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useArchiveItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string, { previous: Item[] | undefined }>({
    mutationFn: (id) => api.post<void>(`/items/${id}/archive`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all })
      const previous = queryClient.getQueryData<Item[]>(queryKeys.items.list())
      if (previous) {
        queryClient.setQueryData<Item[]>(
          queryKeys.items.list(),
          previous.filter((item) => item.id !== id)
        )
      }
      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Item[]>(queryKeys.items.list(), context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Item archived')
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
  })
}

export function useUnarchiveItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string, { previous: Item[] | undefined }>({
    mutationFn: (id) => api.post<void>(`/items/${id}/unarchive`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all })
      const previous = queryClient.getQueryData<Item[]>(queryKeys.items.list('archived'))
      if (previous) {
        queryClient.setQueryData<Item[]>(
          queryKeys.items.list('archived'),
          previous.filter((item) => item.id !== id)
        )
      }
      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Item[]>(queryKeys.items.list('archived'), context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Item unarchived')
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
  })
}

export function useDisposeItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DisposeVars>({
    mutationFn: ({ id, reason }) => api.post<void>(`/items/${id}/dispose`, { reason }),
    onSuccess: () => {
      toast.success('Item disposed')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
  })
}

export function useAssignLocation() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, AssignLocationVars>({
    mutationFn: ({ id, location_id }) =>
      api.patch<void>(`/items/${id}/location`, { location_id }),
    onSuccess: () => {
      toast.success('Location assigned')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
    },
  })
}
