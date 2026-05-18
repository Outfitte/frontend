import { Link, useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useSharedWithMe } from '@/hooks/use-shared-with-me'
import { ItemCard } from '@/components/shared/ItemCard'

export function SharedLocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useSharedWithMe()

  if (isLoading) {
    return (
      <div data-testid="shared-location-detail-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  const sharedLocation = data?.locations.find((l) => l.location.id === id)

  if (!sharedLocation) {
    return (
      <div
        data-testid="shared-location-detail-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground text-lg">Location not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/shared">Back to shared</Link>
        </Button>
      </div>
    )
  }

  return (
    <div data-testid="shared-location-detail-page">
      <div
        data-testid="shared-by-banner"
        className="bg-muted text-muted-foreground mb-4 rounded-md px-4 py-2 text-sm"
      >
        shared by {sharedLocation.shared_by.email}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{sharedLocation.location.label}</h1>
      </div>

      {sharedLocation.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No items</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {sharedLocation.items.map((item) => (
            <li key={item.id}>
              <ItemCard
                item={item}
                isReadOnly
                linkTo={`/shared/items/${item.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
