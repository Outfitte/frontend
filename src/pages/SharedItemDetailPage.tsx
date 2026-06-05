import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { format, parseISO } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSharedWithMe } from '@/hooks/use-shared-with-me'
import { useWearLogs } from '@/hooks/use-wear-logs'
import { useLocations } from '@/hooks/use-locations'
import { useCategories } from '@/hooks/use-categories'
import { getAncestors } from '@/lib/location-tree'
import { cn } from '@/lib/utils'

export function SharedItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useSharedWithMe()
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [prevId, setPrevId] = useState(id)
  if (prevId !== id) {
    setPrevId(id)
    setActivePhotoIdx(0)
  }

  const item = data?.items.find((i) => i.id === id)

  const { data: wearLogs = [] } = useWearLogs(item ? id : undefined)
  const { data: locations = [] } = useLocations()
  const { data: categories = [] } = useCategories()

  if (isLoading) {
    return (
      <div data-testid="shared-item-detail-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div
        data-testid="shared-item-detail-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground text-lg">Item not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/shared">Back to shared</Link>
        </Button>
      </div>
    )
  }

  const categoryLabel = categories.find((c) => c.id === item.category_id)?.label
  const sortedPhotos = [...item.photos].sort((a, b) => a.position - b.position)
  const activePhoto = sortedPhotos[activePhotoIdx]

  const currentLocation = locations.find((l) => l.id === item.location_id)
  const ancestors = item.location_id
    ? getAncestors(locations, item.location_id)
    : []
  const breadcrumbLocations = currentLocation
    ? [...ancestors, currentLocation]
    : ancestors

  const wearCount = wearLogs.length
  const lastWornDate = wearLogs.length > 0 ? wearLogs[0].worn_on : null

  const hasPurchaseData = !!(
    item.purchase_price ||
    item.purchase_currency ||
    item.purchase_date ||
    item.seller_url
  )

  function prevPhoto() {
    setActivePhotoIdx((i) => (i === 0 ? sortedPhotos.length - 1 : i - 1))
  }

  function nextPhoto() {
    setActivePhotoIdx((i) => (i === sortedPhotos.length - 1 ? 0 : i + 1))
  }

  return (
    <div data-testid="shared-item-detail-page">
      {/* Shared-by banner */}
      <div
        data-testid="shared-by-banner"
        className="bg-muted text-muted-foreground mb-4 rounded-md px-4 py-2 text-sm"
      >
        shared by {item.shared_by.email}
      </div>

      {/* Header: name + badges only (no action buttons) */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.brand && <Badge variant="secondary">{item.brand}</Badge>}
          {item.color && <Badge variant="outline">{item.color}</Badge>}
          {categoryLabel && <Badge>{categoryLabel}</Badge>}
        </div>
      </div>

      {/* Two-column layout: photos left, details right */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Photo gallery */}
        <div>
          {sortedPhotos.length === 0 ? (
            <div
              data-testid="photo-placeholder"
              className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-xl border"
            >
              No photo
            </div>
          ) : (
            <div data-testid="photo-gallery">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-xl border">
                <img
                  data-testid="main-photo"
                  src={`/media/${activePhoto.media_key}`}
                  alt={item.name}
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
                      data-testid="photo-thumbnail"
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={cn(
                        'flex-shrink-0 overflow-hidden rounded-lg border',
                        idx === activePhotoIdx ? 'ring-primary ring-2' : ''
                      )}
                    >
                      <img
                        src={`/media/${photo.media_key}`}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          {/* Location breadcrumb */}
          {breadcrumbLocations.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                Location
              </p>
              <nav
                data-testid="location-breadcrumb"
                aria-label="Location breadcrumb"
                className="flex flex-wrap gap-1 text-sm"
              >
                {breadcrumbLocations.map((loc, idx) => (
                  <span key={loc.id} className="flex items-center gap-1">
                    {idx > 0 && (
                      <span className="text-muted-foreground">/</span>
                    )}
                    <span>{loc.label}</span>
                  </span>
                ))}
              </nav>
            </div>
          )}

          {/* Metadata key-value pairs */}
          {Object.keys(item.metadata).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Details
              </p>
              <dl className="space-y-1">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <dt className="text-muted-foreground font-medium">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Purchase section */}
          {hasPurchaseData && (
            <div data-testid="purchase-section">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Purchase
              </p>
              <dl className="space-y-1 text-sm">
                {(item.purchase_price || item.purchase_currency) && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground font-medium">Price</dt>
                    <dd>
                      {item.purchase_price} {item.purchase_currency}
                    </dd>
                  </div>
                )}
                {item.purchase_date && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground font-medium">Date</dt>
                    <dd>
                      {format(parseISO(item.purchase_date), 'MMM d, yyyy')}
                    </dd>
                  </div>
                )}
                {item.seller_url && /^https?:\/\//i.test(item.seller_url) && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground font-medium">
                      Seller
                    </dt>
                    <dd>
                      <a
                        href={item.seller_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Seller
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Wear history (read-only) */}
      <Separator className="my-8" />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Wear History</h2>
        <div className="mb-4 flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground font-medium">Worn </span>
            <span data-testid="wear-count" className="font-bold">
              {wearCount}
            </span>
            <span className="text-muted-foreground"> times</span>
          </div>
          {lastWornDate && (
            <div>
              <span className="text-muted-foreground font-medium">
                Last worn{' '}
              </span>
              <span data-testid="last-worn">
                {format(parseISO(lastWornDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
        <ul className="space-y-2">
          {wearLogs.map((log) => (
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
