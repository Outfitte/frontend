import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { ItemTransferView } from '@/types'

interface CreateTransferVars {
  item_id: string
  recipient_id: string
  transfer_history: boolean
}

export function useOutgoingTransfers() {
  return useQuery<ItemTransferView[], ApiError>({
    queryKey: queryKeys.transfers.outgoing,
    queryFn: () => api.get<ItemTransferView[]>('/transfers/outgoing'),
    refetchOnWindowFocus: true,
  })
}

export function useIncomingTransfers() {
  return useQuery<ItemTransferView[], ApiError>({
    queryKey: queryKeys.transfers.incoming,
    queryFn: () => api.get<ItemTransferView[]>('/transfers/incoming'),
    refetchOnWindowFocus: true,
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useMutation<ItemTransferView, ApiError, CreateTransferVars>({
    mutationFn: (data) => api.post<ItemTransferView>('/transfers', data),
    onSuccess: () => {
      toast.success('Transfer sent')
    },
    onError: (error) => {
      if (error.status !== 409 && error.status !== 422) {
        toast.error(error.message)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.outgoing })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useAcceptTransfer() {
  const queryClient = useQueryClient()
  return useMutation<ItemTransferView, ApiError, string>({
    mutationFn: (id) => api.post<ItemTransferView>(`/transfers/${id}/accept`),
    onSuccess: () => {
      toast.success('Transfer accepted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.incoming })
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.outgoing })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useRejectTransfer() {
  const queryClient = useQueryClient()
  return useMutation<ItemTransferView, ApiError, string>({
    mutationFn: (id) => api.post<ItemTransferView>(`/transfers/${id}/reject`),
    onSuccess: () => {
      toast.success('Transfer rejected')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.incoming })
    },
  })
}

export function useCancelTransfer() {
  const queryClient = useQueryClient()
  return useMutation<ItemTransferView, ApiError, string>({
    mutationFn: (id) => api.post<ItemTransferView>(`/transfers/${id}/cancel`),
    onSuccess: () => {
      toast.success('Transfer cancelled')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.outgoing })
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}
