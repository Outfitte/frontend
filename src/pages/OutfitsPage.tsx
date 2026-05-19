import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { OutfitCard, type OutfitAction } from '@/components/shared/OutfitCard'
import { useOutfits, useDeleteOutfit } from '@/hooks/use-outfits'
import type { Outfit } from '@/types'

type SortOption = 'newest' | 'oldest' | 'name'

function sortOutfits(outfits: Outfit[], sort: SortOption): Outfit[] {
  const sorted = [...outfits]
  if (sort === 'name') {
    sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  } else if (sort === 'oldest') {
    sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
  } else {
    sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  return sorted
}

export function OutfitsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set())

  const rawSort = searchParams.get('sort')
  const sort: SortOption =
    rawSort === 'oldest' || rawSort === 'name' ? rawSort : 'newest'

  const { isLoading, data: outfits } = useOutfits()
  const { mutate: deleteOutfit } = useDeleteOutfit()

  const visibleOutfits = sortOutfits(
    (outfits ?? []).filter((o) => !optimisticallyRemovedIds.has(o.id)),
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

  function handleAction(action: OutfitAction, id: string) {
    if (action === 'edit') {
      navigate(`/outfits/${id}/edit`)
    } else if (action === 'logWear') {
      navigate(`/outfits/${id}`, { state: { openLogForm: true } })
    } else if (action === 'delete') {
      setOptimisticallyRemovedIds((prev) => new Set([...prev, id]))
      deleteOutfit(id, {
        onError: () =>
          setOptimisticallyRemovedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          }),
      })
    }
  }

  return (
    <div data-testid="outfits-page">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name (A–Z)</option>
        </select>

        <Button asChild size="sm" className="ml-auto">
          <Link to="/outfits/new">Create outfit</Link>
        </Button>
      </div>
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              data-testid="outfit-card-skeleton"
              className="h-64 w-full"
            />
          ))}
        </div>
      )}
      {!isLoading && visibleOutfits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground mb-4 text-lg">No outfits yet</p>
          <Button asChild>
            <Link to="/outfits/new">Create your first outfit</Link>
          </Button>
        </div>
      )}
      {!isLoading && visibleOutfits.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
