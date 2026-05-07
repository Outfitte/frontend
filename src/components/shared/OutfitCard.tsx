import { Link } from 'react-router'
import { MoreVerticalIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Outfit } from '@/types'

export type OutfitAction = 'edit' | 'logWear' | 'delete'

interface OutfitCardProps {
  outfit: Outfit
  onAction?: (action: OutfitAction, id: string) => void
  isReadOnly?: boolean
  sharedByEmail?: string
}

export function OutfitCard({ outfit, onAction, isReadOnly, sharedByEmail }: OutfitCardProps) {
  const displayName = outfit.name ?? 'Untitled outfit'
  const firstPhoto = outfit.photos[0]

  return (
    <div data-testid="outfit-card" className="overflow-hidden rounded-xl border bg-card text-card-foreground ring-1 ring-foreground/10">
      <Link to={`/outfits/${outfit.id}`} aria-label={`View ${displayName}`} className="block aspect-square bg-muted">
        {firstPhoto ? (
          <img
            src={`/media/${firstPhoto.media_key}`}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div data-testid="outfit-photo-placeholder" className="flex h-full w-full items-center justify-center text-muted-foreground">
            No photo
          </div>
        )}
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{displayName}</p>
            <p className="text-sm text-muted-foreground">{outfit.items.length} items</p>
            {isReadOnly && sharedByEmail && (
              <span
                data-testid="outfit-shared-badge"
                className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                shared by {sharedByEmail}
              </span>
            )}
          </div>
          {!isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Outfit options"
                  className="flex-shrink-0 rounded p-0.5 hover:bg-muted"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onAction?.('edit', outfit.id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction?.('logWear', outfit.id)}>
                  Log wear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onAction?.('delete', outfit.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
