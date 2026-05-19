import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useItems } from '@/hooks/use-items'

interface ItemPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (itemId: string) => void
  excludeItemIds?: string[]
  closeOnSelect?: boolean
  title?: string
}

export function ItemPicker({
  open,
  onClose,
  onSelect,
  excludeItemIds = [],
  closeOnSelect = true,
  title = 'Add Item',
}: ItemPickerProps) {
  const [search, setSearch] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open && !open) {
    setPrevOpen(open)
    setSearch('')
  }
  const { data: items, isLoading, isError } = useItems('active')

  const excludeSet = useMemo(() => new Set(excludeItemIds), [excludeItemIds])

  const filtered = (items ?? []).filter((item) => {
    if (excludeSet.has(item.id)) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      (item.brand ?? '').toLowerCase().includes(q)
    )
  })

  function handleSelect(itemId: string) {
    onSelect(itemId)
    if (closeOnSelect) onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div data-testid="item-picker-loading" className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p
              data-testid="item-picker-error"
              className="text-destructive py-4 text-center text-sm"
            >
              Failed to load items. Please try again.
            </p>
          ) : filtered.length === 0 ? (
            <p
              data-testid="item-picker-empty"
              className="text-muted-foreground py-4 text-center text-sm"
            >
              No items found
            </p>
          ) : (
            <ul>
              {filtered.map((item) => {
                const firstPhoto = item.photos[0]
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded">
                      {firstPhoto ? (
                        <img
                          src={`/media/${firstPhoto.media_key}`}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      {item.brand && (
                        <p className="text-muted-foreground truncate text-xs">
                          {item.brand}
                        </p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleSelect(item.id)}>
                      Add
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
