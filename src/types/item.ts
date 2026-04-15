export interface Photo {
  id: string
  media_key: string
  position: number
  created_at: string
}

export type ItemStatus = 'active' | 'archived' | 'disposed'

export interface Item {
  id: string
  owner_id: string
  name: string
  brand: string | null
  category_id: string | null
  color: string | null
  status: ItemStatus
  metadata: Record<string, string>
  photos: Photo[]
  location_id: string | null
  purchase_price: string | null
  purchase_currency: string | null
  purchase_date: string | null
  seller_url: string | null
  created_at: string
}
