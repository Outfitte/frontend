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
  linkTo?: string
}

export function OutfitCard({
  outfit,
  onAction,
  isReadOnly,
  sharedByEmail,
  linkTo,
}: OutfitCardProps) {
  const displayName = outfit.name || 'Untitled outfit'
  const firstPhoto = outfit.photos[0]
  const href = linkTo ?? `/outfits/${outfit.id}`

  return (
    <div
      data-testid="outfit-card"
      className="bg-card text-card-foreground ring-foreground/10 overflow-hidden rounded-xl border ring-1"
    >
      <Link
        to={href}
        aria-label={`View ${displayName}`}
        className="bg-muted block aspect-square"
      >
        {firstPhoto ? (
          <img
            src={`/media/${firstPhoto.media_key}`}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            data-testid="outfit-photo-placeholder"
            className="text-muted-foreground flex h-full w-full items-center justify-center"
          >
            No photo
          </div>
        )}
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-medium">{displayName}</p>
            <p className="text-muted-foreground text-sm">
              {outfit.items.length} items
            </p>
            {isReadOnly && sharedByEmail && (
              <span
                data-testid="outfit-shared-badge"
                className="bg-muted mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
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
                  className="hover:bg-muted flex-shrink-0 rounded p-0.5"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => onAction?.('edit', outfit.id)}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onAction?.('logWear', outfit.id)}
                >
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
