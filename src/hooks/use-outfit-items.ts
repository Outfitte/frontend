import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'

interface OutfitItemVars {
  outfitId: string
  itemId: string
}

export function useAddOutfitItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, OutfitItemVars>({
    mutationFn: ({ outfitId, itemId }) =>
      api.post<void>(`/outfits/${outfitId}/items`, { item_id: itemId }),
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) })
    },
  })
}

export function useRemoveOutfitItem() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, OutfitItemVars>({
    mutationFn: ({ outfitId, itemId }) =>
      api.delete<void>(`/outfits/${outfitId}/items/${itemId}`),
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) })
    },
  })
}
