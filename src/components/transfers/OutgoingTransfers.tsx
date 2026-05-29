import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useOutgoingTransfers, useCancelTransfer } from '@/hooks/use-transfers'
import type { ItemTransferView, TransferStatus } from '@/types'

const STATUS_VARIANT: Record<TransferStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  accepted: 'secondary',
  rejected: 'destructive',
  cancelled: 'outline',
}

interface TransferRowProps {
  transfer: ItemTransferView
  onCancel: (id: string) => void
  isMutating: boolean
}

function TransferRow({ transfer, onCancel, isMutating }: TransferRowProps) {
  const firstPhoto = transfer.item.photos?.[0]
  const isPending = transfer.status === 'pending'

  return (
    <li
      data-testid={`transfer-row-${transfer.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border p-3"
    >
      <div className="flex items-center gap-3">
        {firstPhoto ? (
          <img
            src={`/media/${firstPhoto.media_key}`}
            alt={transfer.item.name}
            className="h-12 w-12 rounded object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-muted" />
        )}
        <div className="text-sm">
          <p className="font-medium">{transfer.item.name}</p>
          <p className="text-muted-foreground">To: {transfer.recipient.email}</p>
          <p className="text-muted-foreground text-xs">
            {format(parseISO(transfer.created_at), 'MMM d, yyyy')}
          </p>
          {transfer.decided_at && (
            <p className="text-muted-foreground text-xs">
              {format(parseISO(transfer.decided_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[transfer.status]}>{transfer.status}</Badge>
        {isPending && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(transfer.id)}
            disabled={isMutating}
          >
            Cancel transfer
          </Button>
        )}
      </div>
    </li>
  )
}

export function OutgoingTransfers() {
  const { data: transfers, isLoading, isError, refetch } = useOutgoingTransfers()
  const cancelTransfer = useCancelTransfer()
  const [cancelId, setCancelId] = useState<string | null>(null)

  const isMutating = cancelTransfer.isPending

  function handleCancelRequest(id: string) {
    setCancelId(id)
  }

  function handleCancelConfirm() {
    if (!cancelId) return
    cancelTransfer.mutate(cancelId, {
      onSettled: () => setCancelId(null),
    })
  }

  if (isLoading) {
    return (
      <div data-testid="outgoing-transfers-skeleton" className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div data-testid="outgoing-transfers-error" className="py-12 text-center">
        <p className="text-muted-foreground">Failed to load transfers</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!transfers || transfers.length === 0) {
    return (
      <div data-testid="outgoing-transfers-empty" className="py-12 text-center">
        <p className="text-muted-foreground">You haven&apos;t started any transfers</p>
      </div>
    )
  }

  return (
    <div data-testid="outgoing-transfers">
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      <ul className="space-y-2">
        {transfers.map((transfer) => (
          <TransferRow
            key={transfer.id}
            transfer={transfer}
            onCancel={handleCancelRequest}
            isMutating={isMutating}
          />
        ))}
      </ul>

      <AlertDialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              The item will remain with you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep transfer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
