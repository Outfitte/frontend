import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useOutgoingShares, useRevokeShare } from '@/hooks/use-shares'
import { useItems } from '@/hooks/use-items'
import { useOutfits } from '@/hooks/use-outfits'
import { useLocations } from '@/hooks/use-locations'
import type { Item, Location, Outfit, ShareView } from '@/types'

function resolveTargetLabel(
  share: ShareView,
  allItems: Item[],
  allOutfits: Outfit[],
  allLocations: Location[]
): string {
  if (share.target_type === 'item') {
    return (
      allItems.find((i) => i.id === share.target_id)?.name ?? share.target_id
    )
  }
  if (share.target_type === 'outfit') {
    return (
      allOutfits.find((o) => o.id === share.target_id)?.name ?? share.target_id
    )
  }
  return (
    allLocations.find((l) => l.id === share.target_id)?.label ?? share.target_id
  )
}

interface ShareRowProps {
  share: ShareView
  onRevoke: (id: string) => void
  allItems: Item[]
  allOutfits: Outfit[]
  allLocations: Location[]
}

function ShareRow({
  share,
  onRevoke,
  allItems,
  allOutfits,
  allLocations,
}: ShareRowProps) {
  return (
    <li className="flex items-center justify-between rounded-lg border p-3">
      <div className="text-sm">
        <p className="font-medium">{share.recipient.email}</p>
        <p className="text-muted-foreground">
          {resolveTargetLabel(share, allItems, allOutfits, allLocations)}
        </p>
        <p className="text-muted-foreground text-xs">
          {format(parseISO(share.created_at), 'MMM d, yyyy')}
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onRevoke(share.id)}
      >
        Revoke
      </Button>
    </li>
  )
}

interface ShareSectionProps {
  title: string
  sectionShares: ShareView[]
  onRevoke: (id: string) => void
  allItems: Item[]
  allOutfits: Outfit[]
  allLocations: Location[]
}

function ShareSection({
  title,
  sectionShares,
  onRevoke,
  allItems,
  allOutfits,
  allLocations,
}: ShareSectionProps) {
  if (sectionShares.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ul className="space-y-2">
        {sectionShares.map((share) => (
          <ShareRow
            key={share.id}
            share={share}
            onRevoke={onRevoke}
            allItems={allItems}
            allOutfits={allOutfits}
            allLocations={allLocations}
          />
        ))}
      </ul>
    </section>
  )
}

export function OutgoingSharesPage() {
  const {
    data: shares,
    isLoading: sharesLoading,
    isError,
  } = useOutgoingShares()
  const { data: allItems = [], isLoading: itemsLoading } = useItems('all')
  const { data: allOutfits = [], isLoading: outfitsLoading } = useOutfits()
  const { data: allLocations = [], isLoading: locationsLoading } =
    useLocations()
  const { mutate: revokeShare } = useRevokeShare()
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const isLoading =
    sharesLoading || itemsLoading || outfitsLoading || locationsLoading

  if (isLoading) {
    return (
      <div data-testid="outgoing-shares-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        data-testid="outgoing-shares-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground">
          Failed to load shares. Please try again.
        </p>
      </div>
    )
  }

  if (!shares || shares.length === 0) {
    return (
      <div
        data-testid="outgoing-shares-page"
        className="flex flex-col items-center justify-center py-24"
      >
        <p className="text-muted-foreground">
          You haven&apos;t shared anything yet
        </p>
      </div>
    )
  }

  const itemShares = shares.filter((s) => s.target_type === 'item')
  const outfitShares = shares.filter((s) => s.target_type === 'outfit')
  const locationShares = shares.filter((s) => s.target_type === 'location')

  function handleRevoke(id: string) {
    setRevokeId(id)
  }

  function handleRevokeConfirm() {
    if (!revokeId) return
    revokeShare(revokeId, { onSettled: () => setRevokeId(null) })
  }

  const sharedProps = {
    onRevoke: handleRevoke,
    allItems,
    allOutfits,
    allLocations,
  }

  return (
    <div data-testid="outgoing-shares-page">
      <h1 className="mb-6 text-2xl font-bold">Outgoing Shares</h1>

      <ShareSection title="Items" sectionShares={itemShares} {...sharedProps} />
      <ShareSection
        title="Outfits"
        sectionShares={outfitShares}
        {...sharedProps}
      />
      <ShareSection
        title="Locations"
        sectionShares={locationShares}
        {...sharedProps}
      />

      <AlertDialog
        open={revokeId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke share?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove access for the recipient. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
