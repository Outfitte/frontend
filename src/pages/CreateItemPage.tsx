import { useNavigate } from 'react-router'
import { useCreateItem } from '@/hooks/use-items'
import { useUploadPhoto } from '@/hooks/use-photos'
import { ItemForm } from '@/components/shared/ItemForm'
import type { ItemFormPayload } from '@/components/shared/ItemForm'

export function CreateItemPage() {
  const navigate = useNavigate()
  const { mutateAsync: createItem } = useCreateItem()
  const { mutateAsync: uploadPhoto } = useUploadPhoto()

  async function handleSave(payload: ItemFormPayload, queuedPhotos: File[]) {
    try {
      const item = await createItem({
        name: payload.name,
        brand: payload.brand || undefined,
        category_id: payload.category_id || undefined,
        color: payload.color || undefined,
        location_id: payload.location_id || undefined,
        purchase_price: payload.purchase_price || undefined,
        purchase_currency: payload.purchase_currency || undefined,
        purchase_date: payload.purchase_date || undefined,
        seller_url: payload.seller_url || undefined,
        metadata:
          Object.keys(payload.metadata).length > 0
            ? payload.metadata
            : undefined,
      })

      for (const file of queuedPhotos) {
        await uploadPhoto({ itemId: item.id, photo: file }).catch(() => {})
      }

      navigate(`/items/${item.id}`)
    } catch {
      // hook's onError already shows a toast; stay on form
    }
  }

  return (
    <div data-testid="create-item-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Item</h1>
      </div>

      <ItemForm
        mode="create"
        onSave={handleSave}
        onCancel={() => navigate('/items')}
      />
    </div>
  )
}
