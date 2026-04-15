import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, BASE_URL } from '@/lib/api'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth'
import type { Photo } from '@/types'

interface UploadPhotoVars {
  itemId: string
  photo: File
}

interface DeletePhotoVars {
  itemId: string
  key: string
}

async function uploadPhoto({ itemId, photo }: UploadPhotoVars): Promise<Photo> {
  const { accessToken } = useAuthStore.getState()
  const formData = new FormData()
  formData.append('photo', photo)

  const headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${BASE_URL}/items/${itemId}/photos`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, data.error ?? 'Unknown error')
  }

  return response.json() as Promise<Photo>
}

export function useUploadPhoto() {
  const queryClient = useQueryClient()
  return useMutation<Photo, ApiError, UploadPhotoVars>({
    mutationFn: uploadPhoto,
    onSuccess: (_, { itemId }) => {
      toast.success('Photo uploaded')
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(itemId) })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, DeletePhotoVars>({
    mutationFn: ({ itemId, key }) =>
      api.delete<void>(`/items/${itemId}/photos/${encodeURIComponent(key)}`),
    onSuccess: (_, { itemId }) => {
      toast.success('Photo deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(itemId) })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
