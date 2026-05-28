import { useMemo } from 'react'
import { useOutgoingTransfers } from '@/hooks/use-transfers'

export function usePendingTransferItemIds() {
  const { data, isLoading } = useOutgoingTransfers()

  const ids = useMemo(() => {
    if (!data) return new Set<string>()
    return new Set(
      data.filter((t) => t.status === 'pending').map((t) => t.item_id)
    )
  }, [data])

  return { ids, isLoading }
}

export function useIsItemLocked(itemId?: string): boolean {
  const { ids } = usePendingTransferItemIds()
  if (!itemId) return false
  return ids.has(itemId)
}
