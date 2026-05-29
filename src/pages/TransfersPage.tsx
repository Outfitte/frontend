import { IncomingTransfers } from '@/components/transfers/IncomingTransfers'

export function TransfersPage() {
  return (
    <div data-testid="transfers-page">
      <h1 className="mb-6 text-2xl font-bold">Transfers</h1>
      <IncomingTransfers />
    </div>
  )
}
