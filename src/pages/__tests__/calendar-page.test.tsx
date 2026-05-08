import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { server } from '@/test/mocks/server'
import { render } from '@/test/utils'
import { mockOutfitLog, mockOutfit } from '@/test/mocks/fixtures'
import { CalendarPage } from '@/pages/CalendarPage'

// Fix clock to a known date so May 2026 grid is deterministic.
// May 1 2026 = Friday, so week-Mon grid starts Apr 27 and ends May 31 (35 cells).
const FIXED_NOW = new Date('2026-05-07T12:00:00.000Z')

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: FIXED_NOW.getTime() })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- Failure / loading / error cases ---

  it('CalendarPage should show skeleton while logs are loading', () => {
    server.use(
      http.get('/api/outfit-logs', async () => {
        await new Promise(() => {}) // never resolves
      })
    )
    render(<CalendarPage />)

    expect(screen.getAllByTestId('calendar-skeleton').length).toBeGreaterThan(0)
  })

  // --- Happy path ---

  it('CalendarPage should have data-testid="calendar-page" on root element', () => {
    render(<CalendarPage />)

    expect(screen.getByTestId('calendar-page')).toBeInTheDocument()
  })

  it('CalendarPage should render 7 day-header columns Mon through Sun', async () => {
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())

    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('CalendarPage should default to current month and show month/year header', async () => {
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())

    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('CalendarPage should call outfit-logs endpoint with start and end of current month', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/outfit-logs', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      })
    )
    render(<CalendarPage />)

    await waitFor(() => expect(capturedUrl).toContain('from='))

    const url = new URL(capturedUrl)
    expect(url.searchParams.get('from')).toBe(format(startOfMonth(FIXED_NOW), 'yyyy-MM-dd'))
    expect(url.searchParams.get('to')).toBe(format(endOfMonth(FIXED_NOW), 'yyyy-MM-dd'))
  })

  it('CalendarPage should render all days of current month plus padding days to fill the week grid', async () => {
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())

    // May 2026: grid starts Apr 27 (Mon), ends May 31 (Sun) — 35 days total
    const dayCells = screen.getAllByTestId(/^calendar-day/)
    expect(dayCells).toHaveLength(35)
  })

  it('CalendarPage should render days outside current month with muted styling', async () => {
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())

    const outsideDays = screen.getAllByTestId('calendar-day-outside')
    expect(outsideDays.length).toBeGreaterThan(0)
  })

  it('CalendarPage should show logs in the correct day cell matched by worn_on date', async () => {
    server.use(
      http.get('/api/outfit-logs', () =>
        HttpResponse.json([
          mockOutfitLog({ id: 'log-001', outfit_id: 'outfit-001', worn_on: '2026-05-15' }),
        ])
      ),
      http.get('/api/outfits', () =>
        HttpResponse.json([mockOutfit({ id: 'outfit-001', name: 'Casual Friday' })])
      )
    )
    render(<CalendarPage />)

    expect(await screen.findByText('Casual Friday')).toBeInTheDocument()
  })

  it('CalendarPage should fall back to "Outfit" when outfit name is null', async () => {
    server.use(
      http.get('/api/outfit-logs', () =>
        HttpResponse.json([
          mockOutfitLog({ id: 'log-001', outfit_id: 'outfit-999', worn_on: '2026-05-15' }),
        ])
      ),
      http.get('/api/outfits', () =>
        HttpResponse.json([mockOutfit({ id: 'outfit-999', name: null })])
      )
    )
    render(<CalendarPage />)

    expect(await screen.findByText('Outfit')).toBeInTheDocument()
  })

  it('CalendarPage should navigate to previous month when previous button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /previous month/i }))

    expect(screen.getByText(format(subMonths(FIXED_NOW, 1), 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('CalendarPage should navigate to next month when next button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /next month/i }))

    expect(screen.getByText(format(addMonths(FIXED_NOW, 1), 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('CalendarPage should return to current month when today button is clicked after navigating away', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByText(format(subMonths(FIXED_NOW, 1), 'MMMM yyyy'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^today$/i }))

    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('CalendarPage should render multiple logs on the same day in the same cell', async () => {
    server.use(
      http.get('/api/outfit-logs', () =>
        HttpResponse.json([
          mockOutfitLog({ id: 'log-001', outfit_id: 'outfit-001', worn_on: '2026-05-15' }),
          mockOutfitLog({ id: 'log-002', outfit_id: 'outfit-002', worn_on: '2026-05-15' }),
        ])
      ),
      http.get('/api/outfits', () =>
        HttpResponse.json([
          mockOutfit({ id: 'outfit-001', name: 'Casual Friday' }),
          mockOutfit({ id: 'outfit-002', name: 'Smart Casual' }),
        ])
      )
    )
    render(<CalendarPage />)

    expect(await screen.findByText('Casual Friday')).toBeInTheDocument()
    expect(screen.getByText('Smart Casual')).toBeInTheDocument()
  })

  it('CalendarPage should navigate to /outfits/:id when a log entry is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    server.use(
      http.get('/api/outfit-logs', () =>
        HttpResponse.json([
          mockOutfitLog({ id: 'log-001', outfit_id: 'outfit-001', worn_on: '2026-05-15' }),
        ])
      ),
      http.get('/api/outfits', () =>
        HttpResponse.json([mockOutfit({ id: 'outfit-001', name: 'Casual Friday' })])
      )
    )
    render(
      <Routes>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/outfits/:id" element={<div data-testid="outfit-detail-page" />} />
      </Routes>,
      { initialEntries: ['/calendar'] }
    )

    await user.click(await screen.findByRole('button', { name: 'Casual Friday' }))

    expect(await screen.findByTestId('outfit-detail-page')).toBeInTheDocument()
  })

  it('CalendarPage should show an empty grid when the outfit-logs request fails', async () => {
    server.use(
      http.get('/api/outfit-logs', () => HttpResponse.json({}, { status: 500 }))
    )
    render(<CalendarPage />)

    await waitFor(() => expect(screen.queryByTestId('calendar-skeleton')).not.toBeInTheDocument())

    expect(screen.getAllByTestId(/^calendar-day/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /outfit/i })).not.toBeInTheDocument()
  })
})
