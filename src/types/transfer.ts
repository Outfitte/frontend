import type { Item } from './item'
import type { UserSummary } from './user'

export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface ItemTransfer {
  id: string
  sender_id: string
  recipient_id: string
  status: TransferStatus
  transfer_history: boolean
  created_at: string
  decided_at: string | null
}

export interface ItemTransferView extends ItemTransfer {
  item: Item
  sender: UserSummary
  recipient: UserSummary
}
