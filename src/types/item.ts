export interface Photo {
  id: string
  url: string
  isPrimary: boolean
  createdAt: string
}

export interface ItemMetadata {
  brand?: string
  colors?: string[]
  size?: string
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  purchaseDate?: string
  purchasePrice?: number
  notes?: string
}

export interface Item {
  id: string
  name: string
  description?: string
  categoryId: string
  locationId?: string
  photos: Photo[]
  metadata: ItemMetadata
  createdAt: string
  updatedAt: string
}
