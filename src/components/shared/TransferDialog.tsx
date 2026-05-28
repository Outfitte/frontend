import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useUsers, useMe } from '@/hooks/use-users'
import { useCreateTransfer } from '@/hooks/use-transfers'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
  itemId: string
  itemName: string
}

export function TransferDialog({
  open,
  onClose,
  itemId,
  itemName,
}: TransferDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [transferHistory, setTransferHistory] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: users, isLoading: usersLoading } = useUsers({ enabled: open })
  const { data: me } = useMe({ enabled: open })
  const createTransfer = useCreateTransfer()

  const recipients = (users ?? []).filter((u) => u.id !== me?.id)

  function handleSubmit() {
    if (!selectedUserId) {
      setValidationError('Please select a recipient')
      return
    }
    setValidationError(null)
    setApiError(null)
    createTransfer.mutate(
      {
        item_id: itemId,
        recipient_id: selectedUserId,
        transfer_history: transferHistory,
      },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (error) => {
          if (error.status === 409 || error.status === 422) {
            setApiError(error.message)
          }
        },
      }
    )
  }

  function handleClose() {
    setSelectedUserId('')
    setTransferHistory(false)
    setValidationError(null)
    setApiError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer {itemName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {usersLoading ? (
              <div data-testid="transfer-dialog-loading" className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : recipients.length === 0 ? (
              <p
                data-testid="transfer-dialog-empty"
                className="text-muted-foreground py-4 text-center text-sm"
              >
                No other users to transfer to
              </p>
            ) : (
              <ul
                data-testid="user-list"
                className="max-h-60 space-y-1 overflow-y-auto"
              >
                {recipients.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setValidationError(null)
                      }}
                      className={cn(
                        'w-full rounded px-3 py-2 text-left text-sm transition-colors',
                        selectedUserId === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {user.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {validationError && (
              <p className="text-destructive text-xs">{validationError}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="transfer-history"
                checked={transferHistory}
                onCheckedChange={(checked) =>
                  setTransferHistory(checked === true)
                }
              />
              <div className="space-y-1">
                <Label htmlFor="transfer-history" className="text-sm font-medium">
                  Include wear history
                </Label>
                <p className="text-muted-foreground text-xs">
                  Unchecked: history stays with you. Checked: history travels with the item.
                </p>
              </div>
            </div>
          </div>

          {apiError && (
            <p
              data-testid="transfer-dialog-error"
              className="text-destructive text-xs"
            >
              {apiError}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? 'Transferring…' : 'Transfer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
