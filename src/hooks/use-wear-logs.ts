import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { WearLog } from '@/types'

export function useWearLogs(itemId?: string) {
  return useQuery<WearLog[], ApiError>({
    queryKey: queryKeys.items.wearLogs(itemId!),
    queryFn: () =>
      api
        .get<WearLog[]>(`/items/${itemId}/wear-logs`)
        // Sort client-side: API response order is not guaranteed
        .then((logs) =>
          logs.sort((a, b) => b.worn_on.localeCompare(a.worn_on))
        ),
    enabled: !!itemId,
  })
}

interface LogWearVars {
  itemId: string
  worn_on: string
  notes?: string
}

export function useLogWear() {
  const queryClient = useQueryClient()
  return useMutation<WearLog, ApiError, LogWearVars>({
    mutationFn: ({ itemId, worn_on, notes }) =>
      api.post<WearLog>(`/items/${itemId}/wear-logs`, { worn_on, notes }),
    onSuccess: () => {
      toast.success('Wear logged')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.wearLogs(itemId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(itemId),
      })
    },
  })
}

interface DeleteWearLogVars {
  itemId: string
  logId: string
}

export function useDeleteWearLog() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DeleteWearLogVars>({
    mutationFn: ({ itemId, logId }) =>
      api.delete<void>(`/items/${itemId}/wear-logs/${logId}`),
    onSuccess: () => {
      toast.success('Wear log deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.wearLogs(itemId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(itemId),
      })
    },
  })
}
