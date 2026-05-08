import { Link } from 'react-router'
import { useQueries } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { useItems } from '@/hooks/use-items'
import { useLocations } from '@/hooks/use-locations'
import { useOutfits } from '@/hooks/use-outfits'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Item, WearLog } from '@/types'

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
    const cents = Math.round(parseFloat(item.purchase_price!) * 100)
    currencyGroups.set(currency, (currencyGroups.get(currency) ?? 0) + cents)
  }

  const formatCurrency = (currency: string, cents: number) => {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  if (currencyGroups.size === 1) {
    const [[currency, cents]] = [...currencyGroups]
    return formatCurrency(currency, cents)
  }

  return [...currencyGroups.entries()]
    .map(([currency, cents]) => formatCurrency(currency, cents))
    .join(' + ')
}

function pickMostRecentlyCreated<T extends { created_at: string }>(items: T[] | undefined): T | undefined {
  return items ? [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : undefined
}

function pickMostRecentlyWorn(items: Item[], wearLogSets: (WearLog[] | undefined)[]): Item | undefined {
  let recentItem: Item | undefined
  let recentDate = ''
  for (let i = 0; i < items.length; i++) {
    const logs = wearLogSets[i]
    if (logs && logs.length > 0) {
      const mostRecent = logs.reduce((best, log) => (log.worn_on > best.worn_on ? log : best)).worn_on
      if (mostRecent > recentDate) {
        recentDate = mostRecent
        recentItem = items[i]
      }
    }
  }
  return recentItem
}

function useRecentlyWornItem(items: Item[] | undefined): { item: Item | undefined; isLoading: boolean } {
  const results = useQueries({
    queries: (items ?? []).map((item) => ({
      queryKey: queryKeys.items.wearLogs(item.id),
      queryFn: () =>
        api
          .get<WearLog[]>(`/items/${item.id}/wear-logs`)
          .then((logs) => logs.sort((a, b) => b.worn_on.localeCompare(a.worn_on))),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)

  if (!items || isLoading) return { item: undefined, isLoading }

  return { item: pickMostRecentlyWorn(items, results.map((r) => r.data)), isLoading: false }
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
  const { item: recentlyWorn, isLoading: wearLogsLoading } = useRecentlyWornItem(activeItems)
  const { isLoading: outfitsLoading, data: outfits } = useOutfits()

  const isLoading = itemsLoading || locationsLoading || wearLogsLoading || outfitsLoading

  const recentlyAdded = pickMostRecentlyCreated(activeItems)
  const recentOutfit = pickMostRecentlyCreated(outfits)

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
              <StatCard
                label="Recently worn"
                value={recentlyWorn?.name ?? '—'}
                testId="stat-recently-worn"
              />
              <StatCard label="Wardrobe value" value={wardrobeValue} testId="stat-wardrobe-value" />
              <StatCard label="Total outfits" value={outfits?.length ?? 0} testId="stat-total-outfits" />
              <StatCard
                label="Most recent outfit"
                value={recentOutfit?.name ?? '—'}
                testId="stat-recent-outfit"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
