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
  return useMutation<
    ItemTransferView,
    ApiError,
    CreateTransferVars,
    { prev: ItemTransferView[] | undefined }
  >({
    mutationFn: (data) => api.post<ItemTransferView>('/transfers', data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.transfers.outgoing,
      })
      const prev = queryClient.getQueryData<ItemTransferView[]>(
        queryKeys.transfers.outgoing
      )
      queryClient.setQueryData<ItemTransferView[]>(
        queryKeys.transfers.outgoing,
        (old) => [
          ...(old ?? []),
          {
            id: `optimistic-${vars.item_id}`,
            sender_id: '',
            recipient_id: vars.recipient_id,
            status: 'pending',
            transfer_history: vars.transfer_history,
            created_at: new Date().toISOString(),
            decided_at: null,
            item: {
              id: vars.item_id,
              owner_id: '',
              name: '',
              brand: null,
              category_id: null,
              color: null,
              status: 'active',
              metadata: {},
              photos: [],
              location_id: null,
              purchase_price: null,
              purchase_currency: null,
              purchase_date: null,
              seller_url: null,
              dispose_reason: null,
              created_at: '',
            },
            sender: { id: '', email: '' },
            recipient: { id: vars.recipient_id, email: '' },
          },
        ]
      )
      return { prev }
    },
    onSuccess: () => {
      toast.success('Transfer sent')
    },
    onError: (error, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.transfers.outgoing, context.prev)
      }
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
