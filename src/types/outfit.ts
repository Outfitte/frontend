import type { Photo } from './item'

export interface OutfitItem {
  outfit_id: string
  item_id: string
  position: number
}

export interface Outfit {
  id: string
  owner_id: string
  name: string | null
  notes: string | null
  items: OutfitItem[]
  photos: Photo[]
  created_at: string
}

export interface OutfitLog {
  id: string
  outfit_id: string
  owner_id: string
  worn_on: string
  notes: string | null
  wear_log_ids: string[]
  created_at: string
}
