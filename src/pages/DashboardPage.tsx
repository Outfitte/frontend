import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useItems } from '@/hooks/use-items'
import { useLocations } from '@/hooks/use-locations'
import type { Item } from '@/types'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
}

function computeWardrobeValue(items: Item[]): string {
  const priced = items.filter((i) => i.purchase_price !== null)
  if (priced.length === 0) return '—'

  const currencyGroups = new Map<string, number>()
  for (const item of priced) {
    const currency = item.purchase_currency ?? 'USD'
    currencyGroups.set(currency, (currencyGroups.get(currency) ?? 0) + parseFloat(item.purchase_price!))
  }

  if (currencyGroups.size === 1) {
    const [[currency, total]] = [...currencyGroups]
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency
    return `${symbol}${total.toFixed(2)}`
  }

  return [...currencyGroups.entries()]
    .map(([currency, total]) => {
      const symbol = CURRENCY_SYMBOLS[currency] ?? currency
      return `${symbol}${total.toFixed(2)}`
    })
    .join(' + ')
}

function StatCardSkeleton() {
  return (
    <div data-testid="stat-card-skeleton" className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-9 w-12" />
    </div>
  )
}

function StatCard({ label, value, testId }: { label: string; value: string | number; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { isLoading: itemsLoading, data: activeItems } = useItems('active')
  const { isLoading: locationsLoading, data: locations } = useLocations()

  const isLoading = itemsLoading || locationsLoading

  const recentlyAdded = activeItems
    ? [...activeItems].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    : undefined

  const wardrobeValue = computeWardrobeValue(activeItems ?? [])

  return (
    <div data-testid="dashboard-page">
      <h1 className="text-2xl font-bold">
        Welcome to Outfitte{user?.email ? (
          <>, <span>{user.email}</span></>
        ) : null}
      </h1>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/items/new">Add item</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/items">Log wear</Link>
        </Button>
      </div>

      {!isLoading && activeItems?.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">No items yet</p>
          <Link
            to="/items/new"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Total items" value={activeItems?.length ?? 0} testId="stat-total-items" />
              <StatCard label="Total locations" value={locations?.length ?? 0} testId="stat-total-locations" />
              <StatCard
                label="Recently added"
                value={recentlyAdded?.name ?? '—'}
                testId="stat-recently-added"
              />
              <StatCard label="Wardrobe value" value={wardrobeValue} testId="stat-wardrobe-value" />
            </>
          )}
        </div>
      )}
    </div>
  )
}
