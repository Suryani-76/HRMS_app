import { format, formatDistanceToNow, parseISO, differenceInCalendarDays } from 'date-fns'

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  return format(parseISO(date), 'MMM d, yyyy')
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—'
  return format(parseISO(date), 'MMM d, yyyy h:mm a')
}

export function formatTime(date?: string | null): string {
  if (!date) return '—'
  return format(parseISO(date), 'h:mm a')
}

export function timeAgo(date?: string | null): string {
  if (!date) return ''
  return formatDistanceToNow(parseISO(date), { addSuffix: true })
}

export function formatCurrency(value?: number | null, compact = false): string {
  const n = Number(value ?? 0)
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }
  if (compact) {
    return new Intl.NumberFormat('en-IN', {
      ...opts,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  }
  return new Intl.NumberFormat('en-IN', opts).format(n)
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat('en-IN').format(Number(value ?? 0))
}

export function hoursBetween(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, diff / (1000 * 60 * 60))
}

export function formatHours(hours?: number | null): string {
  const h = Number(hours ?? 0)
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}h ${mm}m`
}

export function currentPayPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthName(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return format(new Date(y, (m || 1) - 1, 1), 'MMMM yyyy')
}

export function isToday(date?: string | null): boolean {
  if (!date) return false
  return format(new Date(), 'yyyy-MM-dd') === date
}

export function daysBetween(start: string, end: string): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toDateInput(date?: string | null): string {
  return date ? (date.length > 10 ? date.slice(0, 10) : date) : ''
}
