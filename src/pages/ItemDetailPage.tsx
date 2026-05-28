import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { format, parseISO, isAfter } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from 'lucide-react'
import { ShareDialog } from '@/components/shared/ShareDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  useItem,
  useArchiveItem,
  useUnarchiveItem,
  useDeleteItem,
  useDisposeItem,
  type DisposeReason,
} from '@/hooks/use-items'
import type { ItemStatus } from '@/types'
import {
  useWearLogs,
  useLogWear,
  useDeleteWearLog,
} from '@/hooks/use-wear-logs'
import { useLocations } from '@/hooks/use-locations'
import { useCategories } from '@/hooks/use-categories'
import { useIsItemLocked } from '@/hooks/use-pending-transfers'
import { TransferDialog } from '@/components/shared/TransferDialog'
import { getAncestors } from '@/lib/location-tree'
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

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [prevId, setPrevId] = useState(id)
  if (prevId !== id) {
    setPrevId(id)
    setActivePhotoIdx(0)
  }

  const [isArchived, setIsArchived] = useState(false)
  const [prevItemStatus, setPrevItemStatus] = useState<ItemStatus | undefined>(
    undefined
  )

  const locked = useIsItemLocked(id)

  const [showWearForm, setShowWearForm] = useState(false)
  const [showDisposeDialog, setShowDisposeDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [disposeReason, setDisposeReason] = useState<DisposeReason>('donated')

  const { data: item, isLoading, error } = useItem(id!)
  if (item?.status !== prevItemStatus) {
    setPrevItemStatus(item?.status)
    if (item) setIsArchived(item.status === 'archived')
  }
  const { data: wearLogs = [] } = useWearLogs(id)
  const { data: locations = [] } = useLocations()
  const { data: categories = [] } = useCategories()

  const { mutate: archiveItem } = useArchiveItem()
  const { mutate: unarchiveItem } = useUnarchiveItem()
  const { mutate: deleteItem } = useDeleteItem()
  const { mutate: disposeItem } = useDisposeItem()
  const { mutate: logWear, isPending: isLoggingWear } = useLogWear()
  const { mutate: deleteWearLog } = useDeleteWearLog()

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
      <div data-testid="item-detail-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div
        data-testid="item-detail-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground text-lg">Item not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/items">Back to items</Link>
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

  // Wear stats — wearLogs already sorted desc by worn_on from the hook
  const wearCount = wearLogs.length
  const lastWornDate = wearLogs.length > 0 ? wearLogs[0].worn_on : null

  const hasPurchaseData = !!(
    item.purchase_price ||
    item.purchase_currency ||
    item.purchase_date ||
    item.seller_url
  )

  function handleArchive() {
    archiveItem(id!, {
      onSuccess: () => setIsArchived(true),
    })
  }

  function handleUnarchive() {
    unarchiveItem(id!, {
      onSuccess: () => setIsArchived(false),
    })
  }

  function handleDelete() {
    deleteItem(id!, {
      onSuccess: () => navigate('/items'),
    })
  }

  function handleDispose() {
    disposeItem(
      { id: id!, reason: disposeReason },
      {
        onSuccess: () => {
          setShowDisposeDialog(false)
          navigate('/items')
        },
      }
    )
  }

  function onWearLogSubmit(values: WearLogFormValues) {
    logWear(
      {
        itemId: id!,
        worn_on: values.worn_on,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowWearForm(false)
          reset()
        },
      }
    )
  }

  function prevPhoto() {
    setActivePhotoIdx((i) => (i === 0 ? sortedPhotos.length - 1 : i - 1))
  }

  function nextPhoto() {
    setActivePhotoIdx((i) => (i === sortedPhotos.length - 1 ? 0 : i + 1))
  }

  return (
    <div data-testid="item-detail-page">
      {locked && (
        <div
          data-testid="item-transfer-banner"
          className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 mb-4 text-sm"
        >
          This item has a pending transfer. Go to{' '}
          <Link to="/transfers" className="underline font-medium">
            Transfers
          </Link>{' '}
          to cancel it.
        </div>
      )}
      {/* Header: name + action buttons */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.brand && <Badge variant="secondary">{item.brand}</Badge>}
            {item.color && <Badge variant="outline">{item.color}</Badge>}
            {categoryLabel && <Badge>{categoryLabel}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/items/${id}/edit`}>Edit</Link>
            </Button>
          )}
          {!locked && (
            isArchived ? (
              <Button variant="outline" size="sm" onClick={handleUnarchive}>
                Unarchive
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleArchive}>
                Archive
              </Button>
            )
          )}
          {!locked && item.status !== 'disposed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              Share
            </Button>
          )}
          {!locked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisposeDialog(true)}
            >
              Dispose
            </Button>
          )}
          {!locked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. &ldquo;{item.name}&rdquo; will
                    be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Confirm delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!locked && item.status !== 'disposed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransferDialog(true)}
            >
              Transfer
            </Button>
          )}
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
              {/* Main photo */}
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
              {/* Thumbnail strip */}
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

          {/* Disposal reason */}
          {item.dispose_reason && (
            <div data-testid="item-dispose-reason">
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                Disposal reason
              </p>
              <p className="text-sm">{item.dispose_reason}</p>
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

      {/* Wear history section */}
      <Separator className="my-8" />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Wear History</h2>
          {!locked && (
            <Button size="sm" onClick={() => setShowWearForm(true)}>
              Log wear
            </Button>
          )}
        </div>

        {/* Wear stats */}
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
                <Input
                  id="worn_on"
                  type="date"
                  {...register('worn_on')}
                  className="mt-1"
                />
                {errors.worn_on && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.worn_on.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  className="mt-1"
                  rows={2}
                />
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
          {wearLogs.map((log) => (
            <li
              key={log.id}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {format(parseISO(log.worn_on), 'MMM d, yyyy')}
                </p>
                {log.notes && (
                  <p className="text-muted-foreground">{log.notes}</p>
                )}
              </div>
              {!locked && (
                <button
                  type="button"
                  aria-label="Delete wear log"
                  onClick={() => deleteWearLog({ itemId: id!, logId: log.id })}
                  className="text-muted-foreground hover:bg-muted hover:text-destructive ml-2 rounded p-1"
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        targetType="item"
        targetId={id!}
        targetLabel={item.name}
      />

      {/* Dispose dialog */}
      <Dialog open={showDisposeDialog} onOpenChange={setShowDisposeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose of {item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dispose-reason">Reason</Label>
            <select
              id="dispose-reason"
              aria-label="Reason"
              value={disposeReason}
              onChange={(e) =>
                setDisposeReason(e.target.value as DisposeReason)
              }
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
            >
              <option value="donated">Donated</option>
              <option value="sold">Sold</option>
              <option value="discarded">Discarded</option>
              <option value="lost">Lost</option>
              <option value="other">Other</option>
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisposeDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleDispose}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        itemId={id!}
        itemName={item.name}
      />
    </div>
  )
}
