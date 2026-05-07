import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { format, parseISO, isAfter } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useOutfit, useDeleteOutfit } from '@/hooks/use-outfits'
import { useOutfitLogs, useLogOutfitWear, useDeleteOutfitLog } from '@/hooks/use-outfit-logs'
import { useItems } from '@/hooks/use-items'
import { cn } from '@/lib/utils'

const wearLogSchema = z.strictObject({
  worn_on: z
    .string()
    .min(1, { error: 'Date is required' })
    .refine((date) => !isAfter(parseISO(date), new Date()), {
      error: 'Date cannot be in the future',
    }),
  notes: z.string().optional(),
})

type WearLogFormValues = z.infer<typeof wearLogSchema>

export function OutfitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: outfit, isLoading, error } = useOutfit(id!)
  const { data: outfitLogs = [] } = useOutfitLogs(id)
  const { data: allItems = [] } = useItems('all')

  const { mutate: deleteOutfit } = useDeleteOutfit()
  const { mutate: logWear, isPending: isLoggingWear } = useLogOutfitWear()
  const { mutate: deleteOutfitLog } = useDeleteOutfitLog()

  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [showWearForm, setShowWearForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WearLogFormValues>({
    resolver: zodResolver(wearLogSchema),
    defaultValues: {
      worn_on: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  })

  if (isLoading) {
    return (
      <div data-testid="outfit-detail-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !outfit) {
    return (
      <div data-testid="outfit-detail-page" className="flex flex-col items-center justify-center py-24">
        <p className="text-lg text-muted-foreground">Outfit not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/outfits">Back to outfits</Link>
        </Button>
      </div>
    )
  }

  const outfitName = outfit.name ?? 'Untitled outfit'
  const sortedPhotos = [...outfit.photos].sort((a, b) => a.position - b.position)
  const activePhoto = sortedPhotos[activePhotoIdx]

  const wearCount = outfitLogs.length
  const lastWornDate = outfitLogs.length > 0 ? outfitLogs[0].worn_on : null

  function prevPhoto() {
    setActivePhotoIdx((i) => (i === 0 ? sortedPhotos.length - 1 : i - 1))
  }

  function nextPhoto() {
    setActivePhotoIdx((i) => (i === sortedPhotos.length - 1 ? 0 : i + 1))
  }

  function handleDelete() {
    deleteOutfit(id!, {
      onSuccess: () => navigate('/outfits'),
    })
  }

  function onWearLogSubmit(values: WearLogFormValues) {
    logWear(
      { outfitId: id!, worn_on: values.worn_on, notes: values.notes || undefined },
      {
        onSuccess: () => {
          setShowWearForm(false)
          reset()
        },
      }
    )
  }

  return (
    <div data-testid="outfit-detail-page">
      {/* Header: name + action buttons */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{outfitName}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/outfits/${id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {outfitName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. &ldquo;{outfitName}&rdquo; will be permanently
                  deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Confirm delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Two-column layout: photos left, details right */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Photo gallery */}
        <div>
          {sortedPhotos.length === 0 ? (
            <div
              data-testid="outfit-photo-placeholder"
              className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground"
            >
              No photo
            </div>
          ) : (
            <div data-testid="outfit-photo-gallery">
              <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                <img
                  data-testid="outfit-main-photo"
                  src={`/media/${activePhoto.media_key}`}
                  alt={outfitName}
                  className="h-full w-full object-cover"
                />
                {sortedPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {sortedPhotos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {sortedPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      type="button"
                      data-testid="outfit-photo-thumbnail"
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={cn(
                        'flex-shrink-0 overflow-hidden rounded-lg border',
                        idx === activePhotoIdx ? 'ring-2 ring-primary' : ''
                      )}
                    >
                      <img
                        src={`/media/${photo.media_key}`}
                        alt={`Photo ${idx + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Items */}
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Items</p>
            {outfit.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {outfit.items.map((outfitItem) => {
                  const item = allItems.find((i) => i.id === outfitItem.item_id)
                  if (!item) return null
                  const thumbnail = item.photos[0]
                  return (
                    <li key={outfitItem.item_id}>
                      <Link
                        to={`/items/${item.id}`}
                        className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-sm hover:bg-muted"
                      >
                        {thumbnail ? (
                          <img
                            src={`/media/${thumbnail.media_key}`}
                            alt={item.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                            No photo
                          </div>
                        )}
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Wear history section */}
      <Separator className="my-8" />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Wear History</h2>
          <Button size="sm" onClick={() => setShowWearForm(true)}>
            Log wear
          </Button>
        </div>

        {/* Wear stats */}
        <div className="mb-4 flex gap-6 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Worn </span>
            <span data-testid="outfit-wear-count" className="font-bold">
              {wearCount}
            </span>
            <span className="text-muted-foreground"> times</span>
          </div>
          {lastWornDate && (
            <div>
              <span className="font-medium text-muted-foreground">Last worn </span>
              <span data-testid="outfit-last-worn">{format(parseISO(lastWornDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Wear log form */}
        {showWearForm && (
          <form
            onSubmit={handleSubmit(onWearLogSubmit)}
            noValidate
            className="mb-6 rounded-lg border p-4"
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="worn_on">Date</Label>
                <Input id="worn_on" type="date" {...register('worn_on')} className="mt-1" />
                {errors.worn_on && (
                  <p className="mt-1 text-xs text-destructive">{errors.worn_on.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register('notes')} className="mt-1" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isLoggingWear}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowWearForm(false)
                    reset()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Wear log list */}
        <ul className="space-y-2">
          {outfitLogs.map((log) => (
            <li key={log.id} className="flex items-start justify-between rounded-lg border p-3">
              <div className="text-sm">
                <p className="font-medium">{format(parseISO(log.worn_on), 'MMM d, yyyy')}</p>
                {log.notes && <p className="text-muted-foreground">{log.notes}</p>}
              </div>
              <button
                type="button"
                aria-label="Delete wear log"
                onClick={() => deleteOutfitLog({ outfitId: id!, logId: log.id })}
                className="ml-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
