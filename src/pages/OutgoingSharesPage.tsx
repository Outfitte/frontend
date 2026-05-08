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
import type { ShareView } from '@/types'

export function OutgoingSharesPage() {
  const { data: shares, isLoading } = useOutgoingShares()
  const { data: allItems = [] } = useItems('all')
  const { data: allOutfits = [] } = useOutfits()
  const { data: allLocations = [] } = useLocations()
  const { mutate: revokeShare } = useRevokeShare()
  const [revokeId, setRevokeId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div data-testid="outgoing-shares-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  if (!shares || shares.length === 0) {
    return (
      <div data-testid="outgoing-shares-page" className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">You haven&apos;t shared anything yet</p>
      </div>
    )
  }

  const itemShares = shares.filter((s) => s.target_type === 'item')
  const outfitShares = shares.filter((s) => s.target_type === 'outfit')
  const locationShares = shares.filter((s) => s.target_type === 'location')

  function resolveTargetLabel(share: ShareView): string {
    if (share.target_type === 'item') {
      return allItems.find((i) => i.id === share.target_id)?.name ?? share.target_id
    }
    if (share.target_type === 'outfit') {
      return allOutfits.find((o) => o.id === share.target_id)?.name ?? share.target_id
    }
    return allLocations.find((l) => l.id === share.target_id)?.label ?? share.target_id
  }

  function handleRevokeConfirm() {
    if (!revokeId) return
    revokeShare(revokeId)
    setRevokeId(null)
  }

  function ShareRow({ share }: { share: ShareView }) {
    return (
      <li className="flex items-center justify-between rounded-lg border p-3">
        <div className="text-sm">
          <p className="font-medium">{share.recipient.email}</p>
          <p className="text-muted-foreground">{resolveTargetLabel(share)}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(share.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setRevokeId(share.id)}>
          Revoke
        </Button>
      </li>
    )
  }

  function ShareSection({ title, sectionShares }: { title: string; sectionShares: ShareView[] }) {
    if (sectionShares.length === 0) return null
    return (
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        <ul className="space-y-2">
          {sectionShares.map((share) => (
            <ShareRow key={share.id} share={share} />
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div data-testid="outgoing-shares-page">
      <h1 className="mb-6 text-2xl font-bold">Outgoing Shares</h1>

      <ShareSection title="Items" sectionShares={itemShares} />
      <ShareSection title="Outfits" sectionShares={outfitShares} />
      <ShareSection title="Locations" sectionShares={locationShares} />

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
              This will remove access for the recipient. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeConfirm}>Confirm revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
