import { useNavigate, useParams } from 'react-router'
import { useItem, useUpdateItem } from '@/hooks/use-items'
import { useUploadPhoto } from '@/hooks/use-photos'
import { useCategories } from '@/hooks/use-categories'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemForm } from '@/components/shared/ItemForm'
import type { ItemFormPayload } from '@/components/shared/ItemForm'
import type { FieldHint } from '@/types'

export function EditItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id!)
  const { data: categories = [] } = useCategories()
  const { mutateAsync: updateItem } = useUpdateItem()
  const { mutateAsync: uploadPhoto } = useUploadPhoto()

  if (isLoading) {
    return (
      <div data-testid="edit-item-skeleton" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error?.status === 404) {
    return (
      <div data-testid="edit-item-page">
        <p>Item not found</p>
      </div>
    )
  }

  if (!item) return null

  // Split item metadata into hint values and user rows
  const category = categories.find((c) => c.id === item.category_id)
  const hintKeys = new Set<string>(category?.field_hints.map((h: FieldHint) => h.key) ?? [])

  const defaultHintValues: Record<string, string> = {}
  const userMetadata: Array<{ key: string; value: string }> = []

  for (const [key, value] of Object.entries(item.metadata)) {
    if (hintKeys.has(key)) {
      defaultHintValues[key] = value
    } else {
      userMetadata.push({ key, value })
    }
  }

  async function handleSave(payload: ItemFormPayload, queuedPhotos: File[]) {
    try {
      await updateItem({
        id: item!.id,
        data: {
          name: payload.name,
          brand: payload.brand || null,
          category_id: payload.category_id || null,
          color: payload.color || null,
          location_id: payload.location_id || null,
          purchase_price: payload.purchase_price || null,
          purchase_currency: payload.purchase_currency || null,
          purchase_date: payload.purchase_date || null,
          seller_url: payload.seller_url || null,
          metadata: payload.metadata,
        },
      })

      for (const file of queuedPhotos) {
        await uploadPhoto({ itemId: item!.id, photo: file }).catch(() => {})
      }

      navigate(`/items/${item!.id}`)
    } catch {
      // hook's onError already shows a toast; stay on form
    }
  }

  return (
    <div data-testid="edit-item-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Item</h1>
      </div>

      <ItemForm
        mode="edit"
        defaultValues={{
          name: item.name,
          brand: item.brand ?? '',
          category_id: item.category_id ?? '',
          color: item.color ?? '',
          location_id: item.location_id ?? '',
          purchase_price: item.purchase_price ?? '',
          purchase_currency: item.purchase_currency ?? '',
          purchase_date: item.purchase_date ?? '',
          seller_url: item.seller_url ?? '',
          metadata: userMetadata,
        }}
        defaultHintValues={defaultHintValues}
        defaultCategoryHints={category?.field_hints}
        existingPhotos={item.photos}
        itemId={item.id}
        onSave={handleSave}
        onCancel={() => navigate(`/items/${item!.id}`)}
      />
    </div>
  )
}
