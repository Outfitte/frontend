import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useMoveLocation,
  useDeleteLocation,
} from '@/hooks/use-locations'
import { ShareDialog } from '@/components/shared/ShareDialog'
import {
  buildLocationTree,
  flattenTree,
  getAncestors,
  getDescendantIds,
  type LocationTreeNode,
} from '@/lib/location-tree'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Item, Location } from '@/types'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.strictObject({
  label: z.string().min(1, { error: 'Label is required' }),
  parent_id: z.string().optional(),
})
type CreateFormValues = z.infer<typeof createSchema>

// ─── TreeNode ─────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: LocationTreeNode
  depth: number
  selectedId: string | null
  collapsedIds: Set<string>
  renamingId: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onRenameStart: (id: string) => void
  onRenameSubmit: (id: string, label: string) => void
  onRenameCancel: () => void
  onMoveStart: (id: string) => void
  onDeleteStart: (id: string) => void
  onShareStart: (id: string) => void
}

function TreeNode({
  node,
  depth,
  selectedId,
  collapsedIds,
  renamingId,
  onToggle,
  onSelect,
  onRenameStart,
  onRenameSubmit,
  onRenameCancel,
  onMoveStart,
  onDeleteStart,
  onShareStart,
}: TreeNodeProps) {
  const isExpanded = !collapsedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isRenaming = renamingId === node.id
  const hasChildren = node.children.length > 0
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      renameRef.current?.focus()
    }
  }, [isRenaming])

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const value = renameRef.current?.value.trim() ?? ''
      if (value) onRenameSubmit(node.id, value)
    } else if (e.key === 'Escape') {
      onRenameCancel()
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        data-testid={`tree-node-${node.id}`}
        className={`group flex cursor-pointer items-center gap-1 rounded py-1 ${isSelected ? 'bg-muted' : 'hover:bg-muted'}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(node.id)
        }}
      >
        {hasChildren ? (
          <button
            data-testid={`toggle-${node.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            className="hover:bg-muted-foreground/20 rounded p-0.5"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {isRenaming ? (
          <input
            ref={renameRef}
            data-testid={`rename-input-${node.id}`}
            defaultValue={node.label}
            className="min-w-0 flex-1 rounded border px-1 text-sm"
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-sm">{node.label}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid={`context-menu-${node.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:bg-muted-foreground/20 rounded p-0.5 opacity-0 group-hover:opacity-100"
              aria-label="More options"
            >
              <MoreHorizontal className="text-muted-foreground h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRenameStart(node.id)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMoveStart(node.id)}>
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onShareStart(node.id)}>
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDeleteStart(node.id)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            collapsedIds={collapsedIds}
            renamingId={renamingId}
            onToggle={onToggle}
            onSelect={onSelect}
            onRenameStart={onRenameStart}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            onMoveStart={onMoveStart}
            onDeleteStart={onDeleteStart}
            onShareStart={onShareStart}
          />
        ))}
    </>
  )
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  location: Location
  locations: Location[]
  items: Item[]
}

function DetailPanel({ location, locations, items }: DetailPanelProps) {
  const ancestors = getAncestors(locations, location.id)
  const locationItems = items.filter((item) => item.location_id === location.id)

  return (
    <div
      data-testid="location-detail-panel"
      className="flex-1 overflow-auto p-6"
    >
      {ancestors.length > 0 && (
        <div
          data-testid="location-breadcrumb"
          className="text-muted-foreground mb-2 flex items-center gap-1 text-sm"
        >
          {ancestors.map((ancestor, i) => (
            <span key={ancestor.id}>
              {i > 0 && <span className="mx-1">/</span>}
              {ancestor.label}
            </span>
          ))}
          <span className="mx-1">/</span>
        </div>
      )}
      <h1 className="mb-4 text-xl font-semibold">{location.label}</h1>
      <div className="space-y-2">
        {locationItems.map((item) => (
          <div key={item.id} className="rounded border p-3 text-sm">
            {item.name}
          </div>
        ))}
        {locationItems.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No items in this location
          </p>
        )}
      </div>
    </div>
  )
}

// ─── CreateDialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean
  locations: Location[]
  onClose: () => void
}

function CreateDialog({ open, locations, onClose }: CreateDialogProps) {
  const { mutate: createLocation, isPending } = useCreateLocation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
  })
  const flatLocations = flattenTree(buildLocationTree(locations))

  function onSubmit(data: CreateFormValues) {
    createLocation(
      { label: data.label, parent_id: data.parent_id || null },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create location</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="create-label">Label</Label>
            <Input id="create-label" {...register('label')} />
            {errors.label && (
              <p className="text-destructive text-xs">{errors.label.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-parent">Parent</Label>
            <select
              id="create-parent"
              {...register('parent_id')}
              className="bg-background w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">None (root)</option>
              {flatLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {'—'.repeat(loc.depth)} {loc.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MoveDialog ───────────────────────────────────────────────────────────────

interface MoveDialogProps {
  locationId: string
  locations: Location[]
  onClose: () => void
}

function MoveDialog({ locationId, locations, onClose }: MoveDialogProps) {
  const { mutate: moveLocation, isPending } = useMoveLocation()
  const disabledIds = new Set([
    locationId,
    ...getDescendantIds(locations, locationId),
  ])
  const flatLocations = flattenTree(buildLocationTree(locations))

  function handleMove(parentId: string | null) {
    moveLocation(
      { id: locationId, parent_id: parentId },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move location</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 space-y-1 overflow-auto">
          <button
            data-testid="move-option-root"
            disabled={isPending}
            className="hover:bg-muted w-full rounded px-3 py-2 text-left text-sm disabled:opacity-50"
            onClick={() => handleMove(null)}
          >
            Root (no parent)
          </button>
          {flatLocations.map((loc) => (
            <button
              key={loc.id}
              data-testid={`move-option-${loc.id}`}
              disabled={disabledIds.has(loc.id) || isPending}
              className="hover:bg-muted w-full rounded px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ paddingLeft: loc.depth * 16 + 12 }}
              onClick={() => handleMove(loc.id)}
            >
              {loc.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeleteDialog ─────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  locationId: string
  onClose: () => void
}

function DeleteDialog({ locationId, onClose }: DeleteDialogProps) {
  const { mutate: deleteLocation, isPending } = useDeleteLocation()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete() {
    setDeleteError(null)
    deleteLocation(locationId, {
      onSuccess: onClose,
      onError: (error) => setDeleteError(error.message),
    })
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete location</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this location? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteError && (
          <p className="text-destructive px-1 text-sm">{deleteError}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── LocationsPage ────────────────────────────────────────────────────────────

export function LocationsPage() {
  const { data: locations = [], isLoading } = useLocations()
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: queryKeys.items.list('all'),
    queryFn: () => api.get<Item[]>('/items?status=all'),
  })
  const { mutate: updateLocation } = useUpdateLocation()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)

  function onToggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function onRenameSubmit(id: string, label: string) {
    updateLocation({ id, label }, { onSuccess: () => setRenamingId(null) })
  }

  if (isLoading) {
    return (
      <div data-testid="locations-page">
        <div data-testid="locations-tree-skeleton" className="space-y-2 p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="ml-4 h-6 w-40" />
          <Skeleton className="h-6 w-44" />
        </div>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div
        data-testid="locations-page"
        className="flex h-64 flex-col items-center justify-center gap-4"
      >
        <p className="text-muted-foreground">No locations yet</p>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create location
        </Button>
        <CreateDialog
          open={showCreateDialog}
          locations={[]}
          onClose={() => setShowCreateDialog(false)}
        />
      </div>
    )
  }

  const tree = buildLocationTree(locations)
  const selectedLocation = selectedId
    ? locations.find((l) => l.id === selectedId)
    : null

  return (
    <div data-testid="locations-page" className="flex h-full">
      <div className="w-64 space-y-1 overflow-auto border-r p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Locations</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
          >
            Create location
          </Button>
        </div>
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            collapsedIds={collapsedIds}
            renamingId={renamingId}
            onToggle={onToggle}
            onSelect={setSelectedId}
            onRenameStart={setRenamingId}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={() => setRenamingId(null)}
            onMoveStart={setMovingId}
            onDeleteStart={setDeletingId}
            onShareStart={setSharingId}
          />
        ))}
      </div>
      {selectedLocation && (
        <DetailPanel
          location={selectedLocation}
          locations={locations}
          items={items}
        />
      )}
      <CreateDialog
        open={showCreateDialog}
        locations={locations}
        onClose={() => setShowCreateDialog(false)}
      />
      {movingId && (
        <MoveDialog
          locationId={movingId}
          locations={locations}
          onClose={() => setMovingId(null)}
        />
      )}
      {deletingId && (
        <DeleteDialog
          locationId={deletingId}
          onClose={() => setDeletingId(null)}
        />
      )}
      {sharingId && (
        <ShareDialog
          open
          onClose={() => setSharingId(null)}
          targetType="location"
          targetId={sharingId}
          targetLabel={locations.find((l) => l.id === sharingId)?.label}
        />
      )}
    </div>
  )
}
