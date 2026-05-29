import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockItemTransferView } from '@/test/mocks/fixtures'
import { TransfersPage } from '@/pages/TransfersPage'

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function renderPage(initialEntries?: string[]) {
  return render(<TransfersPage />, {
    initialEntries: initialEntries ?? ['/transfers'],
  })
}

describe('TransfersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TransfersPage should show incoming loading skeleton within the Incoming tab panel', () => {
    server.use(
      http.get('/api/transfers/incoming', async () => {
        await new Promise(() => {})
      })
    )
    renderPage()
    expect(
      screen.getByTestId('incoming-transfers-skeleton')
    ).toBeInTheDocument()
  })

  it('TransfersPage should show outgoing empty state within the Outgoing tab panel', async () => {
    const user = userEvent.setup()
    server.use(http.get('/api/transfers/outgoing', () => HttpResponse.json([])))
    renderPage()
    await screen.findByRole('tab', { name: 'Incoming' })
    await user.click(screen.getByRole('tab', { name: 'Outgoing' }))
    expect(
      await screen.findByTestId('outgoing-transfers-empty')
    ).toBeInTheDocument()
  })

  it('TransfersPage should not show OutgoingTransfers content on default Incoming tab', async () => {
    renderPage()
    await screen.findByRole('tab', { name: 'Incoming' })
    expect(screen.queryByTestId('outgoing-transfers')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('outgoing-transfers-empty')
    ).not.toBeInTheDocument()
  })

  it('TransfersPage should not show IncomingTransfers content after switching to Outgoing tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('incoming-transfers')
    await user.click(screen.getByRole('tab', { name: 'Outgoing' }))
    await waitFor(() =>
      expect(screen.queryByTestId('incoming-transfers')).not.toBeInTheDocument()
    )
    expect(
      screen.queryByTestId('incoming-transfers-skeleton')
    ).not.toBeInTheDocument()
  })

  it('TransfersPage should not refetch outgoing when Refresh is clicked on Incoming tab', async () => {
    const user = userEvent.setup()
    let outgoingCallCount = 0
    server.use(
      http.get('/api/transfers/outgoing', () => {
        outgoingCallCount++
        return HttpResponse.json([mockItemTransferView({ id: 'transfer-001' })])
      })
    )
    renderPage()
    await screen.findByTestId('incoming-transfers')
    const callsBefore = outgoingCallCount
    await user.click(screen.getByTestId('transfers-refresh'))
    await screen.findByTestId('incoming-transfers')
    expect(outgoingCallCount).toBe(callsBefore)
  })

  it('TransfersPage should render Incoming and Outgoing tab buttons', async () => {
    renderPage()
    expect(
      await screen.findByRole('tab', { name: 'Incoming' })
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Outgoing' })).toBeInTheDocument()
  })

  it('TransfersPage should render transfers-page root element', async () => {
    renderPage()
    expect(await screen.findByTestId('transfers-page')).toBeInTheDocument()
  })

  it('TransfersPage should show IncomingTransfers content in default Incoming tab', async () => {
    renderPage()
    expect(await screen.findByTestId('incoming-transfers')).toBeInTheDocument()
  })

  it('TransfersPage should show OutgoingTransfers content when Outgoing tab is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('tab', { name: 'Incoming' })
    await user.click(screen.getByRole('tab', { name: 'Outgoing' }))
    expect(await screen.findByTestId('outgoing-transfers')).toBeInTheDocument()
  })

  it('TransfersPage should activate Outgoing tab when it is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('tab', { name: 'Incoming' })
    await user.click(screen.getByRole('tab', { name: 'Outgoing' }))
    await screen.findByTestId('outgoing-transfers')
    expect(screen.getByRole('tab', { name: 'Outgoing' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('TransfersPage should open Outgoing tab when URL has ?tab=outgoing', async () => {
    renderPage(['/transfers?tab=outgoing'])
    expect(await screen.findByTestId('outgoing-transfers')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Outgoing' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('TransfersPage should default to Incoming tab when URL has an unknown tab value', async () => {
    renderPage(['/transfers?tab=unknown'])
    expect(await screen.findByTestId('incoming-transfers')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Incoming' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('TransfersPage should refetch incoming query when Refresh is clicked on Incoming tab', async () => {
    const user = userEvent.setup()
    let incomingCallCount = 0
    server.use(
      http.get('/api/transfers/incoming', () => {
        incomingCallCount++
        return HttpResponse.json([mockItemTransferView({ id: 'transfer-002' })])
      })
    )
    renderPage()
    await screen.findByTestId('incoming-transfers')
    const callsBefore = incomingCallCount
    await user.click(screen.getByTestId('transfers-refresh'))
    await waitFor(() => expect(incomingCallCount).toBeGreaterThan(callsBefore))
  })

  it('TransfersPage should refetch outgoing query when Refresh is clicked on Outgoing tab', async () => {
    const user = userEvent.setup()
    let outgoingCallCount = 0
    server.use(
      http.get('/api/transfers/outgoing', () => {
        outgoingCallCount++
        return HttpResponse.json([mockItemTransferView({ id: 'transfer-001' })])
      })
    )
    renderPage(['/transfers?tab=outgoing'])
    await screen.findByTestId('outgoing-transfers')
    const callsBefore = outgoingCallCount
    await user.click(screen.getByTestId('transfers-refresh'))
    await waitFor(() => expect(outgoingCallCount).toBeGreaterThan(callsBefore))
  })
})
