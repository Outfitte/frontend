import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUsers, useMe } from '@/hooks/use-users'
import { useCreateShare } from '@/hooks/use-shares'
import type { UserSummary } from '@/types'

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

  const { data: users } = useUsers()
  const { data: me } = useMe()
  const createShare = useCreateShare()

  const title = targetLabel ? `Share ${targetLabel}` : 'Share'

  const recipients = (users ?? []).filter(
    (u: UserSummary) => u.id !== me?.id
  )

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
          onClose()
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
          <ul data-testid="user-list" className="max-h-60 overflow-y-auto space-y-1">
            {recipients.map((user: UserSummary) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(user.id)
                    setValidationError(null)
                  }}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {user.email}
                </button>
              </li>
            ))}
          </ul>
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
          <Button onClick={handleSubmit}>
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
