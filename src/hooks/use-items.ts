import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Item } from '@/types'

export type ItemStatus = 'active' | 'archived' | 'all'

export type DisposeReason = 'donated' | 'sold' | 'discarded' | 'lost' | 'other'

interface CreateItemVars {
  name: string
  brand?: string | null
  category_id?: string | null
  color?: string | null
  location_id?: string | null
  purchase_price?: string | null
  purchase_currency?: string | null
  purchase_date?: string | null
  seller_url?: string | null
  metadata?: Record<string, string>
}

interface UpdateItemVars {
  id: string
  data: Partial<Item>
}

interface DisposeVars {
  id: string
  reason: DisposeReason
}

interface AssignLocationVars {
  id: string
  location_id: string | null
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useItems(status?: ItemStatus) {
  return useQuery<Item[], ApiError>({
    queryKey: queryKeys.items.list(status),
    queryFn: () => {
      const path = status
        ? `/items?${new URLSearchParams({ status }).toString()}`
        : '/items'
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
  return useMutation<Item, ApiError, CreateItemVars>({
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
    onSuccess: () => {
      toast.success('Item updated')
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
      // Cancel only the default (active) list to avoid cancelling unrelated status variants
      await queryClient.cancelQueries({ queryKey: queryKeys.items.list() })
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
      // Cancel only the archived list to avoid cancelling unrelated status variants
      await queryClient.cancelQueries({ queryKey: queryKeys.items.list('archived') })
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
  // No optimistic update — dispose is irreversible; confirm with server before updating UI
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
