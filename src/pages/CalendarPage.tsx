import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOutfitLogsByRange } from '@/hooks/use-outfit-logs'
import { useOutfits } from '@/hooks/use-outfits'
import type { OutfitLog } from '@/types'
import { cn } from '@/lib/utils'

// Week starts on Monday (ISO week convention)
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildGridDays(viewedMonth: Date): Date[] {
  const monthStart = startOfMonth(viewedMonth)
  const monthEnd = endOfMonth(viewedMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

function resolveOutfitName(
  outfitId: string,
  outfits: { id: string; name: string | null }[]
): string {
  const outfit = outfits.find((o) => o.id === outfitId)
  return outfit?.name ?? 'Outfit'
}

function groupLogsByDate(logs: OutfitLog[]): Record<string, OutfitLog[]> {
  return logs.reduce<Record<string, OutfitLog[]>>((acc, log) => {
    const key = log.worn_on
    acc[key] = acc[key] ? [...acc[key], log] : [log]
    return acc
  }, {})
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [viewedMonth, setViewedMonth] = useState(new Date())

  const from = format(startOfMonth(viewedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(viewedMonth), 'yyyy-MM-dd')

  const { isLoading, data: logs = [] } = useOutfitLogsByRange(from, to)
  const { data: outfits = [] } = useOutfits()

  const gridDays = buildGridDays(viewedMonth)
  const logsByDate = groupLogsByDate(logs)

  return (
    <div data-testid="calendar-page">
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => setViewedMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="min-w-[140px] text-center text-lg font-semibold">
          {format(viewedMonth, 'MMMM yyyy')}
        </h2>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => setViewedMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setViewedMonth(new Date())}>
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} data-testid="calendar-skeleton" className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px">
          {gridDays.map((day) => {
            const inMonth = isSameMonth(day, viewedMonth)
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayLogs = logsByDate[dateKey] ?? []

            return (
              <div
                key={day.toISOString()}
                data-testid={inMonth ? 'calendar-day' : 'calendar-day-outside'}
                className={cn(
                  'min-h-20 p-1',
                  !inMonth && 'text-muted-foreground'
                )}
              >
                <span className="block text-right text-sm">{format(day, 'd')}</span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayLogs.map((log) => (
                    <button
                      key={log.id}
                      aria-label={resolveOutfitName(log.outfit_id, outfits)}
                      className="truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs hover:bg-primary/20"
                      onClick={() => navigate(`/outfits/${log.outfit_id}`)}
                    >
                      {resolveOutfitName(log.outfit_id, outfits)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
