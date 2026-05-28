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
import {
  useIncomingTransfers,
  useAcceptTransfer,
  useRejectTransfer,
} from '@/hooks/use-transfers'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ItemTransferView } from '@/types'

interface TransferRowProps {
  transfer: ItemTransferView
  onAccept: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean
}

function TransferRow({ transfer, onAccept, onReject, isPending }: TransferRowProps) {
  const firstPhoto = transfer.item.photos?.[0]
  const isPendingStatus = transfer.status === 'pending'

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
          <p className="text-muted-foreground">From: {transfer.sender.email}</p>
          <p className="text-muted-foreground text-xs">
            {format(parseISO(transfer.created_at), 'MMM d, yyyy')}
          </p>
          <p className="text-muted-foreground text-xs">
            {transfer.transfer_history ? 'Wear history included' : 'Wear history not included'}
          </p>
        </div>
      </div>
      {isPendingStatus && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept(transfer.id)}
            disabled={isPending}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(transfer.id)}
            disabled={isPending}
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  )
}

export function IncomingTransfers() {
  const { data: transfers, isLoading, refetch } = useIncomingTransfers()
  const acceptTransfer = useAcceptTransfer()
  const rejectTransfer = useRejectTransfer()
  const queryClient = useQueryClient()
  const [rejectId, setRejectId] = useState<string | null>(null)

  const isMutating = acceptTransfer.isPending || rejectTransfer.isPending

  function handleAccept(id: string) {
    acceptTransfer.mutate(id)
  }

  function handleRejectRequest(id: string) {
    setRejectId(id)
  }

  function handleRejectConfirm() {
    if (!rejectId) return
    rejectTransfer.mutate(rejectId, {
      onSettled: () => setRejectId(null),
    })
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.transfers.incoming })
  }

  if (isLoading) {
    return (
      <div data-testid="incoming-transfers-skeleton" className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!transfers || transfers.length === 0) {
    return (
      <div data-testid="incoming-transfers-empty" className="py-12 text-center">
        <p className="text-muted-foreground">No incoming transfers</p>
      </div>
    )
  }

  return (
    <div data-testid="incoming-transfers">
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
      <ul className="space-y-2">
        {transfers.map((transfer) => (
          <TransferRow
            key={transfer.id}
            transfer={transfer}
            onAccept={handleAccept}
            onReject={handleRejectRequest}
            isPending={isMutating}
          />
        ))}
      </ul>

      <AlertDialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              The item will remain with the sender. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
