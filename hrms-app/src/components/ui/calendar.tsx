import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface CalendarDayMarker {
  date: Date
  className?: string
  dotClassName?: string
  title?: string
}

interface CalendarProps {
  selected?: Date | null
  onSelect?: (date: Date) => void
  month?: Date
  onMonthChange?: (month: Date) => void
  markers?: CalendarDayMarker[]
  disabledDate?: (date: Date) => boolean
  className?: string
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function Calendar({ selected, onSelect, month, onMonthChange, markers = [], disabledDate, className }: CalendarProps) {
  const [view, setView] = React.useState(month ?? new Date())
  const activeMonth = month ?? view

  const changeMonth = (delta: number) => {
    const next = addMonths(activeMonth, delta)
    setView(next)
    onMonthChange?.(next)
  }

  const days = eachDayOfInterval({ start: startOfMonth(activeMonth), end: endOfMonth(activeMonth) })
  const firstDay = getDay(startOfMonth(activeMonth))
  const leading: (Date | null)[] = Array.from({ length: firstDay }, () => null)

  const markerFor = (date: Date) => markers.find((m) => isSameDay(m.date, date))

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between py-1">
        <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{format(activeMonth, 'MMMM yyyy')}</div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {leading.map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {days.map((date) => {
          const marker = markerFor(date)
          const disabled = disabledDate?.(date)
          const isSelected = selected ? isSameDay(selected, date) : false
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(date)}
              className={cn(
                'relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                isSameMonth(date, activeMonth) ? 'text-foreground' : 'text-muted-foreground opacity-40',
                isToday(date) && !isSelected && 'font-semibold text-primary',
                isSelected && 'bg-primary text-primary-foreground font-semibold',
                !isSelected && !disabled && 'hover:bg-accent',
                marker?.className,
                disabled && 'pointer-events-none opacity-40',
              )}
            >
              {format(date, 'd')}
              {marker?.dotClassName && (
                <span className={cn('absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full', marker.dotClassName)} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
