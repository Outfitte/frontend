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
  onWoreToday?: (itemId: string) => void
  onAction?: (action: ItemAction, itemId: string) => void
}

export function ItemCard({ item, categoryLabel, isArchived, onWoreToday, onAction }: ItemCardProps) {
  const firstPhoto = item.photos[0]

  return (
    <div data-testid="item-card" className="overflow-hidden rounded-xl border bg-card text-card-foreground ring-1 ring-foreground/10">
      <Link to={`/items/${item.id}`} aria-label={`View ${item.name}`} className="block aspect-square bg-muted">
        {firstPhoto ? (
          <img
            src={`/media/${firstPhoto.media_key}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div data-testid="item-photo-placeholder" className="flex h-full w-full items-center justify-center text-muted-foreground">
            No photo
          </div>
        )}
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{item.name}</p>
            {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
            {categoryLabel && (
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
                {categoryLabel}
              </span>
            )}
            {item.status !== 'active' && (
              <span
                data-testid="item-status-badge"
                className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs capitalize text-amber-800"
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            )}
            {item.status === 'disposed' && item.dispose_reason && (
              <p data-testid="item-card-dispose-reason" className="mt-0.5 text-xs text-muted-foreground">
                {item.dispose_reason}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Item options"
                className="flex-shrink-0 rounded p-0.5 hover:bg-muted"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAction?.('edit', item.id)}>
                Edit
              </DropdownMenuItem>
              {isArchived ? (
                <DropdownMenuItem onSelect={() => onAction?.('unarchive', item.id)}>
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => onAction?.('archive', item.id)}>
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction?.('dispose', item.id)}>
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
        </div>
        <button
          type="button"
          onClick={() => onWoreToday?.(item.id)}
          className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
        >
          Wore today
        </button>
      </div>
    </div>
  )
}
