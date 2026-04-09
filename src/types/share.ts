import type { Item } from './item'
import type { Location } from './location'
import type { Outfit } from './outfit'
import type { UserSummary } from './user'

export interface Share {
  id: string
  recipient_id: string
  target_type: 'item' | 'outfit' | 'location'
  target_id: string
  created_at: string
}

export interface ShareView {
  id: string
  recipient: UserSummary
  target_type: 'item' | 'outfit' | 'location'
  target_id: string
  created_at: string
}

export interface SharedItem extends Item {
  shared_by: UserSummary
}

export interface SharedOutfit extends Outfit {
  shared_by: UserSummary
}

export interface SharedLocation {
  location: Location
  items: Item[]
  shared_by: UserSummary
}

export interface SharedWithMeResult {
  items: SharedItem[]
  outfits: SharedOutfit[]
  locations: SharedLocation[]
}
