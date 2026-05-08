import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useUsers, useMe } from '@/hooks/use-users'
import { useCreateShare } from '@/hooks/use-shares'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  targetType: 'item' | 'outfit' | 'location'
  targetId: string
  targetLabel?: string
}

export function ShareDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ShareDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: me } = useMe()
  const createShare = useCreateShare()

  const title = targetLabel ? `Share ${targetLabel}` : 'Share'

  const recipients = (users ?? []).filter((u) => u.id !== me?.id)

  function handleSubmit() {
    if (!selectedUserId) {
      setValidationError('Please select a recipient')
      return
    }
    setValidationError(null)
    setApiError(null)
    createShare.mutate(
      { recipient_id: selectedUserId, target_type: targetType, target_id: targetId },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (error) => {
          if (error.status === 409 || error.status === 422) {
            setApiError(error.message)
          } else {
            toast.error(error.message)
          }
        },
      }
    )
  }

  function handleClose() {
    setSelectedUserId('')
    setValidationError(null)
    setApiError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {usersLoading ? (
            <div data-testid="share-dialog-loading" className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <p data-testid="share-dialog-empty" className="py-4 text-center text-sm text-muted-foreground">
              No other users to share with
            </p>
          ) : (
            <ul data-testid="user-list" className="max-h-60 overflow-y-auto space-y-1">
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
          {apiError && (
            <p className="text-destructive text-xs">{apiError}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createShare.isPending}>
            {createShare.isPending ? 'Sharing…' : 'Share'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
