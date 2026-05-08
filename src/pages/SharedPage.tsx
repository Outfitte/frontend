import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemCard } from '@/components/shared/ItemCard'
import { OutfitCard } from '@/components/shared/OutfitCard'
import { useSharedWithMe } from '@/hooks/use-shared-with-me'
import type { SharedItem, SharedLocation, SharedOutfit } from '@/types'

function ItemsSection({ items }: { items: SharedItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">Items</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isReadOnly
            sharedByEmail={item.shared_by.email}
            linkTo={`/shared/items/${item.id}`}
          />
        ))}
      </div>
    </section>
  )
}

function OutfitsSection({ outfits }: { outfits: SharedOutfit[] }) {
  if (outfits.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">Outfits</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {outfits.map((outfit) => (
          <OutfitCard
            key={outfit.id}
            outfit={outfit}
            isReadOnly
            sharedByEmail={outfit.shared_by.email}
            linkTo={`/shared/outfits/${outfit.id}`}
          />
        ))}
      </div>
    </section>
  )
}

function LocationsSection({ locations }: { locations: SharedLocation[] }) {
  if (locations.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">Locations</h2>
      <ul className="space-y-2">
        {locations.map(({ location, items }) => (
          <li key={location.id}>
            <Link
              to={`/shared/locations/${location.id}`}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
            >
              <span className="font-medium">{location.label}</span>
              <span className="text-sm text-muted-foreground">{items.length} items</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SharedPage() {
  const { data, isLoading, isError } = useSharedWithMe()

  if (isLoading) {
    return (
      <div data-testid="shared-page-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div data-testid="shared-page" className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Failed to load shared items. Please try again.</p>
      </div>
    )
  }

  const isEmpty =
    !data || (data.items.length === 0 && data.outfits.length === 0 && data.locations.length === 0)

  if (isEmpty) {
    return (
      <div data-testid="shared-page" className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Nothing has been shared with you yet</p>
      </div>
    )
  }

  return (
    <div data-testid="shared-page">
      <h1 className="mb-6 text-2xl font-bold">Shared with me</h1>
      <ItemsSection items={data.items} />
      <OutfitsSection outfits={data.outfits} />
      <LocationsSection locations={data.locations} />
    </div>
  )
}
