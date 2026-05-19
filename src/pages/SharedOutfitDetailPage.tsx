import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { format, parseISO } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSharedWithMe } from '@/hooks/use-shared-with-me'
import { useOutfitLogs } from '@/hooks/use-outfit-logs'
import { cn } from '@/lib/utils'

export function SharedOutfitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useSharedWithMe()
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [prevId, setPrevId] = useState(id)
  if (prevId !== id) {
    setPrevId(id)
    setActivePhotoIdx(0)
  }

  const outfit = data?.outfits.find((o) => o.id === id)

  const { data: outfitLogs = [] } = useOutfitLogs(outfit ? id : undefined)

  if (isLoading) {
    return (
      <div data-testid="shared-outfit-detail-skeleton" className="space-y-4">
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

  if (!outfit) {
    return (
      <div
        data-testid="shared-outfit-detail-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground text-lg">Outfit not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/shared">Back to shared</Link>
        </Button>
      </div>
    )
  }

  const outfitName = outfit.name ?? 'Untitled outfit'
  const sortedPhotos = [...outfit.photos].sort(
    (a, b) => a.position - b.position
  )
  const activePhoto = sortedPhotos[activePhotoIdx]

  const sharedItems = data?.items ?? []
  const wearCount = outfitLogs.length
  const lastWornDate = outfitLogs.length > 0 ? outfitLogs[0].worn_on : null

  function prevPhoto() {
    setActivePhotoIdx((i) => (i === 0 ? sortedPhotos.length - 1 : i - 1))
  }

  function nextPhoto() {
    setActivePhotoIdx((i) => (i === sortedPhotos.length - 1 ? 0 : i + 1))
  }

  return (
    <div data-testid="shared-outfit-detail-page">
      {/* Shared-by banner */}
      <div
        data-testid="shared-by-banner"
        className="bg-muted text-muted-foreground mb-4 rounded-md px-4 py-2 text-sm"
      >
        shared by {outfit.shared_by.email}
      </div>

      {/* Header: name only (no action buttons) */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{outfitName}</h1>
        {outfit.notes && (
          <p className="text-muted-foreground mt-1 text-sm">{outfit.notes}</p>
        )}
      </div>

      {/* Two-column layout: photos left, items right */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Photo gallery */}
        <div>
          {sortedPhotos.length === 0 ? (
            <div
              data-testid="outfit-photo-placeholder"
              className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-xl border"
            >
              No photo
            </div>
          ) : (
            <div data-testid="outfit-photo-gallery">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-xl border">
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
                      className="bg-background/80 hover:bg-background absolute top-1/2 left-2 -translate-y-1/2 rounded-full p-1"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={nextPhoto}
                      className="bg-background/80 hover:bg-background absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1"
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
                        idx === activePhotoIdx ? 'ring-primary ring-2' : ''
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

        {/* Right: Items grid */}
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              Items
            </p>
            {outfit.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No items</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {outfit.items.map((outfitItem) => {
                  const sharedItem = sharedItems.find(
                    (i) => i.id === outfitItem.item_id
                  )
                  const thumbnail = sharedItem?.photos[0]
                  const itemName = sharedItem?.name ?? outfitItem.item_id

                  if (sharedItem) {
                    return (
                      <li key={outfitItem.item_id} data-testid="outfit-item">
                        <Link
                          to={`/shared/items/${sharedItem.id}`}
                          className="hover:bg-muted flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-sm"
                        >
                          {thumbnail ? (
                            <img
                              src={`/media/${thumbnail.media_key}`}
                              alt={itemName}
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="bg-muted text-muted-foreground flex h-16 w-16 items-center justify-center rounded text-xs">
                              No photo
                            </div>
                          )}
                          <span>{itemName}</span>
                        </Link>
                      </li>
                    )
                  }

                  return (
                    <li
                      key={outfitItem.item_id}
                      data-testid="outfit-item-unlinked"
                    >
                      <div className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-sm opacity-60">
                        <div className="bg-muted text-muted-foreground flex h-16 w-16 items-center justify-center rounded text-xs">
                          No access
                        </div>
                        <span className="text-muted-foreground">Item</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Wear history (read-only) */}
      <Separator className="my-8" />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Wear History</h2>
        <div className="mb-4 flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground font-medium">Worn </span>
            <span data-testid="outfit-wear-count" className="font-bold">
              {wearCount}
            </span>
            <span className="text-muted-foreground"> times</span>
          </div>
          {lastWornDate && (
            <div>
              <span className="text-muted-foreground font-medium">
                Last worn{' '}
              </span>
              <span data-testid="outfit-last-worn">
                {format(parseISO(lastWornDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
        <ul className="space-y-2">
          {outfitLogs.map((log) => (
            <li key={log.id} className="rounded-lg border p-3">
              <div className="text-sm">
                <p className="font-medium">
                  {format(parseISO(log.worn_on), 'MMM d, yyyy')}
                </p>
                {log.notes && (
                  <p className="text-muted-foreground">{log.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
