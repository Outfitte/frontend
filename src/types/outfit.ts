export interface OutfitItem {
  itemId: string
  position: number
}

export interface Outfit {
  id: string
  name: string
  description?: string
  items: OutfitItem[]
  createdAt: string
  updatedAt: string
}

export interface OutfitLog {
  id: string
  outfitId: string
  wornAt: string
  notes?: string
  createdAt: string
}
