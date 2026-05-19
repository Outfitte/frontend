import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOutfit, useUpdateOutfit } from '@/hooks/use-outfits'
import { useItems } from '@/hooks/use-items'
import { useAddOutfitItem, useRemoveOutfitItem } from '@/hooks/use-outfit-items'
import {
  useUploadOutfitPhoto,
  useDeleteOutfitPhoto,
} from '@/hooks/use-outfit-photos'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ItemPicker } from '@/components/shared/ItemPicker'
import type { Outfit, Photo } from '@/types'

const schema = z.strictObject({
  name: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function EditOutfitPage() {
  const { id } = useParams()
  const { data: outfit, isLoading, error } = useOutfit(id!)

  if (isLoading) {
    return (
      <div data-testid="edit-outfit-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error?.status === 404) {
    return (
      <div data-testid="edit-outfit-page">
        <p>Outfit not found</p>
      </div>
    )
  }

  if (!outfit) return null

  return <EditOutfitForm outfit={outfit} outfitId={id!} />
}

interface EditOutfitFormProps {
  outfit: Outfit
  outfitId: string
}

function EditOutfitForm({ outfit, outfitId }: EditOutfitFormProps) {
  const navigate = useNavigate()
  const { data: allItems = [] } = useItems('active')
  const { mutateAsync: updateOutfit } = useUpdateOutfit()
  const { mutateAsync: addItem } = useAddOutfitItem()
  const { mutateAsync: removeItem } = useRemoveOutfitItem()
  const { mutateAsync: uploadPhoto } = useUploadOutfitPhoto()
  const { mutateAsync: deletePhoto } = useDeleteOutfitPhoto()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [queuedPhotos, setQueuedPhotos] = useState<
    Array<{ file: File; preview: string }>
  >([])
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>(outfit.photos)

  useEffect(() => {
    return () => {
      queuedPhotos.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  }, [queuedPhotos])

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: outfit.name ?? '',
      notes: outfit.notes ?? '',
    },
  })

  const outfitItemIds = outfit.items.map((oi) => oi.item_id)
  const resolvedItems = outfitItemIds
    .map((itemId) => allItems.find((item) => item.id === itemId))
    .filter(Boolean) as typeof allItems

  async function onSubmit(values: FormValues) {
    try {
      await updateOutfit({
        id: outfitId,
        data: {
          name: values.name || null,
          notes: values.notes || null,
        },
      })

      for (const queued of queuedPhotos) {
        await uploadPhoto({ outfitId, photo: queued.file })
      }

      navigate(`/outfits/${outfitId}`)
    } catch {
      // hook's onError already shows toast; stay on form
    }
  }

  async function handleAddItem(itemId: string) {
    try {
      await addItem({ outfitId, itemId })
    } catch {
      // hook's onError already shows toast
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      await removeItem({ outfitId, itemId })
    } catch {
      // hook's onError already shows toast
    }
  }

  async function handleDeletePhoto(photo: Photo) {
    try {
      await deletePhoto({ outfitId, mediaKey: photo.media_key })
      setCurrentPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    } catch {
      // hook's onError already shows toast
    }
  }

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newQueued = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setQueuedPhotos((prev) => [...prev, ...newQueued])
  }

  return (
    <div data-testid="edit-outfit-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Outfit</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="max-w-2xl space-y-6"
      >
        {/* ── Name & notes ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. Casual Friday"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Optional notes about this outfit"
            />
          </div>
        </section>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Items</h2>
          <ul className="mb-3 space-y-2">
            {resolvedItems.map((item) => {
              const firstPhoto = item.photos[0]
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded border p-2"
                >
                  <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded">
                    {firstPhoto ? (
                      <img
                        src={`/media/${firstPhoto.media_key}`}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                        ?
                      </div>
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium">
                    {item.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            Add item
          </Button>
          <ItemPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={handleAddItem}
            excludeItemIds={outfitItemIds}
          />
        </section>

        {/* ── Photos ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Photos</h2>
          <div className="space-y-4">
            {currentPhotos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {currentPhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={`/media/${photo.media_key}`}
                      alt={`Existing photo ${photo.id}`}
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Delete photo ${photo.id}`}
                      onClick={() => handleDeletePhoto(photo)}
                      className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-0.5 leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label htmlFor="photo-input">Add Photos</Label>
              <Input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                className="mt-1"
                onChange={handlePhotoInput}
              />
            </div>

            {queuedPhotos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {queuedPhotos.map((photo, idx) => (
                  <div key={photo.preview} className="relative">
                    <img
                      src={photo.preview}
                      alt={`Photo ${idx + 1}`}
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/outfits/${outfitId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
