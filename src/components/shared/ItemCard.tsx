import { Link } from 'react-router'
import { MoreVerticalIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Item } from '@/types'

export type ItemAction = 'edit' | 'archive' | 'unarchive' | 'dispose' | 'delete'

interface ItemCardProps {
  item: Item
  categoryLabel?: string
  isArchived?: boolean
  isReadOnly?: boolean
  isLocked?: boolean
  sharedByEmail?: string
  linkTo?: string
  onWoreToday?: (itemId: string) => void
  onAction?: (action: ItemAction, itemId: string) => void
  onTransfer?: (itemId: string) => void
}

export function ItemCard({
  item,
  categoryLabel,
  isArchived,
  isReadOnly,
  isLocked,
  sharedByEmail,
  linkTo,
  onWoreToday,
  onAction,
  onTransfer,
}: ItemCardProps) {
  const firstPhoto = item.photos[0]
  const href = linkTo ?? `/items/${item.id}`

  return (
    <div
      data-testid="item-card"
      className="bg-card text-card-foreground ring-foreground/10 overflow-hidden rounded-xl border ring-1"
    >
      <Link
        to={href}
        aria-label={`View ${item.name}`}
        className="bg-muted block aspect-square"
      >
        {firstPhoto ? (
          <img
            src={`/media/${firstPhoto.media_key}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            data-testid="item-photo-placeholder"
            className="text-muted-foreground flex h-full w-full items-center justify-center"
          >
            No photo
          </div>
        )}
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-medium">{item.name}</p>
            {item.brand && (
              <p className="text-muted-foreground text-sm">{item.brand}</p>
            )}
            {categoryLabel && (
              <span className="bg-muted mt-1 inline-block rounded-full px-2 py-0.5 text-xs">
                {categoryLabel}
              </span>
            )}
            {item.status !== 'active' && (
              <span
                data-testid="item-status-badge"
                className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 capitalize"
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            )}
            {item.status === 'disposed' && item.dispose_reason && (
              <p
                data-testid="item-card-dispose-reason"
                className="text-muted-foreground mt-0.5 text-xs"
              >
                {item.dispose_reason}
              </p>
            )}
            {isReadOnly && sharedByEmail && (
              <span
                data-testid="item-shared-badge"
                className="bg-muted mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
              >
                shared by {sharedByEmail}
              </span>
            )}
            {!isReadOnly && isLocked && (
              <span
                data-testid="item-locked-badge"
                className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
              >
                Transfer pending
              </span>
            )}
          </div>
          {!isReadOnly && !isLocked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Item options"
                  className="hover:bg-muted flex-shrink-0 rounded p-0.5"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onAction?.('edit', item.id)}>
                  Edit
                </DropdownMenuItem>
                {isArchived ? (
                  <DropdownMenuItem
                    onSelect={() => onAction?.('unarchive', item.id)}
                  >
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => onAction?.('archive', item.id)}
                  >
                    Archive
                  </DropdownMenuItem>
                )}
                {onTransfer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onTransfer(item.id)}>
                      Transfer…
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onAction?.('dispose', item.id)}
                >
                  Dispose
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onAction?.('delete', item.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {!isReadOnly && !isLocked && (
          <button
            type="button"
            onClick={() => onWoreToday?.(item.id)}
            className="border-input bg-background hover:bg-muted mt-2 w-full rounded-md border px-2 py-1 text-xs"
          >
            Wore today
          </button>
        )}
      </div>
    </div>
  )
}
