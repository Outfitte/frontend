import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Photo } from '@/types'

interface UploadPhotoVars {
  itemId: string
  photo: File
}

interface DeletePhotoVars {
  itemId: string
  key: string
}

export function useUploadPhoto() {
  const queryClient = useQueryClient()
  return useMutation<Photo, ApiError, UploadPhotoVars>({
    mutationFn: ({ itemId, photo }) => {
      const formData = new FormData()
      formData.append('photo', photo)
      return api.upload<Photo>(`/items/${itemId}/photos`, formData)
    },
    onSuccess: () => {
      toast.success('Photo uploaded')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(itemId),
      })
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DeletePhotoVars>({
    mutationFn: ({ itemId, key }) =>
      api.delete<void>(`/items/${itemId}/photos/${encodeURIComponent(key)}`),
    onSuccess: () => {
      toast.success('Photo deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.detail(itemId),
      })
    },
  })
}
