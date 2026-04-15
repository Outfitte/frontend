import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ItemCard, type ItemAction } from '@/components/shared/ItemCard'
import { useItems, useArchiveItem, useUnarchiveItem, useDeleteItem, type ItemStatus } from '@/hooks/use-items'
import { useCategories } from '@/hooks/use-categories'
import { useLocations } from '@/hooks/use-locations'
import { useLogWear } from '@/hooks/use-wear-logs'
import type { Item } from '@/types'

type SortOption = 'newest' | 'oldest' | 'name'

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

function sortItems(items: Item[], sort: SortOption): Item[] {
  const sorted = [...items]
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'oldest') {
    sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
  } else {
    sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  return sorted
}

export function ItemsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<Set<string>>(new Set())

  const status = (searchParams.get('status') as ItemStatus) ?? 'active'
  const categoryFilter = searchParams.get('category') ?? ''
  const locationFilter = searchParams.get('location') ?? ''
  const sort = (searchParams.get('sort') as SortOption) ?? 'newest'

  const { isLoading, data: items } = useItems(status)
  const { data: categories } = useCategories()
  const { data: locations } = useLocations()
  const { mutate: logWear } = useLogWear()
  const { mutate: archiveItem } = useArchiveItem()
  const { mutate: unarchiveItem } = useUnarchiveItem()
  const { mutate: deleteItem } = useDeleteItem()

  const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c.label]))

  const filteredItems = sortItems(
    (items ?? []).filter((item) => {
      if (optimisticallyRemovedIds.has(item.id)) return false
      if (categoryFilter && item.category_id !== categoryFilter) return false
      if (locationFilter && item.location_id !== locationFilter) return false
      return true
    }),
    sort
  )

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function handleWoreToday(itemId: string) {
    logWear({ itemId, worn_on: format(new Date(), 'yyyy-MM-dd') })
  }

  function handleAction(action: ItemAction, itemId: string) {
    if (action === 'edit') {
      navigate(`/items/${itemId}/edit`)
    } else if (action === 'archive') {
      setOptimisticallyRemovedIds((prev) => new Set([...prev, itemId]))
      archiveItem(itemId, {
        onError: () =>
          setOptimisticallyRemovedIds((prev) => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
          }),
        onSettled: () =>
          setOptimisticallyRemovedIds((prev) => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
          }),
      })
    } else if (action === 'unarchive') {
      setOptimisticallyRemovedIds((prev) => new Set([...prev, itemId]))
      unarchiveItem(itemId, {
        onError: () =>
          setOptimisticallyRemovedIds((prev) => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
          }),
        onSettled: () =>
          setOptimisticallyRemovedIds((prev) => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
          }),
      })
    } else if (action === 'delete') {
      deleteItem(itemId)
    } else if (action === 'dispose') {
      navigate(`/items/${itemId}/dispose`)
    }
  }

  return (
    <div data-testid="items-page">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setParam('status', value)}
              className={`px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md ${
                status === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          aria-label="Category"
          value={categoryFilter}
          onChange={(e) => setParam('category', e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Location"
          value={locationFilter}
          onChange={(e) => setParam('location', e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none"
        >
          <option value="">All locations</option>
          {(locations ?? []).map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name (A–Z)</option>
        </select>

        <Button asChild size="sm" className="ml-auto">
          <Link to="/items/new">Add item</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} data-testid="item-card-skeleton" className="h-64 w-full" />
          ))}
        </div>
      )}
      {!isLoading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-4 text-lg text-muted-foreground">No items yet</p>
          <Button asChild>
            <Link to="/items/new">Add your first item</Link>
          </Button>
        </div>
      )}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryLabel={item.category_id ? categoryMap[item.category_id] : undefined}
              isArchived={status === 'archived'}
              onWoreToday={handleWoreToday}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
