import { useSearchParams } from 'react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { IncomingTransfers } from '@/components/transfers/IncomingTransfers'
import { OutgoingTransfers } from '@/components/transfers/OutgoingTransfers'
import {
  useIncomingTransfers,
  useOutgoingTransfers,
} from '@/hooks/use-transfers'

type TabValue = 'incoming' | 'outgoing'

const TAB_VALUES: TabValue[] = ['incoming', 'outgoing']

function resolveTab(raw: string | null): TabValue {
  return TAB_VALUES.includes(raw as TabValue) ? (raw as TabValue) : 'incoming'
}

export function TransfersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = resolveTab(searchParams.get('tab'))

  const { refetch: refetchIncoming } = useIncomingTransfers()
  const { refetch: refetchOutgoing } = useOutgoingTransfers()

  function handleTabChange(value: string) {
    setSearchParams({ tab: value })
  }

  function handleRefresh() {
    if (activeTab === 'outgoing') {
      refetchOutgoing()
    } else {
      refetchIncoming()
    }
  }

  return (
    <div data-testid="transfers-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <Button
          data-testid="transfers-refresh"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">
          <IncomingTransfers />
        </TabsContent>
        <TabsContent value="outgoing">
          <OutgoingTransfers />
        </TabsContent>
      </Tabs>
    </div>
  )
}
