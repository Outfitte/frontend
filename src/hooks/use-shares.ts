import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Share, ShareView } from '@/types'

interface CreateShareVars {
  recipient_id: string
  target_type: 'item' | 'outfit' | 'location'
  target_id: string
}

export function useOutgoingShares() {
  return useQuery<ShareView[], ApiError>({
    queryKey: queryKeys.shares.outgoing,
    queryFn: () => api.get<ShareView[]>('/shares'),
  })
}

export function useCreateShare() {
  const queryClient = useQueryClient()
  return useMutation<Share, ApiError, CreateShareVars>({
    mutationFn: (data) => api.post<Share>('/shares', data),
    onSuccess: () => {
      toast.success('Share created')
    },
    onError: (error) => {
      if (error.status !== 409 && error.status !== 422) {
        toast.error(error.message)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.outgoing })
    },
  })
}

export function useRevokeShare() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/shares/${id}`),
    onSuccess: () => {
      toast.success('Share revoked')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.outgoing })
    },
  })
}
