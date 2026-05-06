import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import type { Photo } from '@/types'

interface UploadOutfitPhotoVars {
  outfitId: string
  photo: File
}

interface DeleteOutfitPhotoVars {
  outfitId: string
  mediaKey: string
}

export function useUploadOutfitPhoto() {
  const queryClient = useQueryClient()
  return useMutation<Photo, ApiError, UploadOutfitPhotoVars>({
    mutationFn: ({ outfitId, photo }) => {
      const formData = new FormData()
      formData.append('photo', photo)
      return api.upload<Photo>(`/outfits/${outfitId}/photos`, formData)
    },
    onSuccess: () => {
      toast.success('Photo uploaded')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) })
    },
  })
}

export function useDeleteOutfitPhoto() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DeleteOutfitPhotoVars>({
    mutationFn: ({ outfitId, mediaKey }) =>
      api.delete<void>(`/outfits/${outfitId}/photos/${encodeURIComponent(mediaKey)}`),
    onSuccess: () => {
      toast.success('Photo deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: (_, __, { outfitId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) })
    },
  })
}
