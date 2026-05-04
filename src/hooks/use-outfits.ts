import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Outfit } from '@/types'

interface OutfitFilter {
  from?: string
  to?: string
}

interface CreateOutfitVars {
  name: string
  notes?: string | null
}

interface UpdateOutfitVars {
  id: string
  data: Partial<Outfit>
}

export function useOutfits(filter?: OutfitFilter) {
  return useQuery<Outfit[], ApiError>({
    queryKey: queryKeys.outfits.list(filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter?.from) params.set('from', filter.from)
      if (filter?.to) params.set('to', filter.to)
      const qs = params.toString()
      return api.get<Outfit[]>(qs ? `/outfits?${qs}` : '/outfits')
    },
  })
}

export function useOutfit(id: string) {
  return useQuery<Outfit, ApiError>({
    queryKey: queryKeys.outfits.detail(id),
    queryFn: () => api.get<Outfit>(`/outfits/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateOutfit() {
  const queryClient = useQueryClient()
  return useMutation<Outfit, ApiError, CreateOutfitVars>({
    mutationFn: (data) => api.post<Outfit>('/outfits', data),
    onSuccess: () => {
      toast.success('Outfit created')
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateOutfit() {
  const queryClient = useQueryClient()
  return useMutation<Outfit, ApiError, UpdateOutfitVars>({
    mutationFn: ({ id, data }) => api.patch<Outfit>(`/outfits/${id}`, data),
    onSuccess: () => {
      toast.success('Outfit updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(id) })
    },
  })
}

export function useDeleteOutfit() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/outfits/${id}`),
    onSuccess: () => {
      toast.success('Outfit deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
