import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { OutfitLog } from '@/types'

export function useOutfitLogs(outfitId?: string) {
  return useQuery<OutfitLog[], ApiError>({
    queryKey: queryKeys.outfits.logs(outfitId!),
    queryFn: () =>
      api
        .get<OutfitLog[]>(`/outfits/${outfitId}/logs`)
        .then((logs) => logs.sort((a, b) => b.worn_on.localeCompare(a.worn_on))),
    enabled: !!outfitId,
  })
}

export function useOutfitLogsByRange(from?: string, to?: string) {
  return useQuery<OutfitLog[], ApiError>({
    queryKey: queryKeys.outfitLogs.range(from!, to!),
    queryFn: () => {
      const params = new URLSearchParams({ from: from!, to: to! })
      return api.get<OutfitLog[]>(`/outfit-logs?${params}`)
    },
    enabled: !!from && !!to,
  })
}

interface LogOutfitWearVars {
  outfitId: string
  worn_on: string
  notes?: string
}

export function useLogOutfitWear() {
  const queryClient = useQueryClient()
  return useMutation<OutfitLog, ApiError, LogOutfitWearVars>({
    mutationFn: ({ outfitId, worn_on, notes }) =>
      api.post<OutfitLog>(`/outfits/${outfitId}/logs`, { worn_on, notes }),
    onSuccess: () => {
      toast.success('Outfit wear logged')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.logs(outfitId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfitLogs.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

interface UpdateOutfitLogVars {
  outfitId: string
  logId: string
  worn_on: string
}

export function useUpdateOutfitLog() {
  const queryClient = useQueryClient()
  return useMutation<OutfitLog, ApiError, UpdateOutfitLogVars>({
    mutationFn: ({ outfitId, logId, worn_on }) =>
      api.patch<OutfitLog>(`/outfits/${outfitId}/logs/${logId}`, { worn_on }),
    onSuccess: () => {
      toast.success('Outfit log updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.logs(outfitId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfitLogs.all })
    },
  })
}

interface DeleteOutfitLogVars {
  outfitId: string
  logId: string
}

export function useDeleteOutfitLog() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DeleteOutfitLogVars>({
    mutationFn: ({ outfitId, logId }) =>
      api.delete<void>(`/outfits/${outfitId}/logs/${logId}`),
    onSuccess: () => {
      toast.success('Outfit log deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.logs(outfitId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.outfitLogs.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}
