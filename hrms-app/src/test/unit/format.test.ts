/**
 * UNIT TESTS — format.ts
 * White-box: tests every exported function with normal, edge, and null inputs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// We freeze time so date-relative functions are deterministic
const FIXED_NOW = new Date('2024-06-15T10:30:00.000Z')

import {
  formatDate,
  formatDateTime,
  formatTime,
  timeAgo,
  formatCurrency,
  formatNumber,
  hoursBetween,
  formatHours,
  currentPayPeriod,
  monthName,
  isToday,
  daysBetween,
  todayISO,
  toDateInput,
} from '@/lib/format'

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    expect(formatDate('2024-03-25')).toBe('Mar 25, 2024')
  })
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })
  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })
  it('handles ISO datetime strings (strips time)', () => {
    expect(formatDate('2024-12-01T00:00:00.000Z')).toBe('Dec 1, 2024')
  })
})

describe('formatDateTime', () => {
  it('formats a date-time string', () => {
    // exact output depends on locale; check shape
    const result = formatDateTime('2024-03-25T14:30:00')
    expect(result).toMatch(/Mar 25, 2024/)
  })
  it('returns em-dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })
  it('returns em-dash for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })
})

describe('formatTime', () => {
  it('extracts time from datetime', () => {
    const result = formatTime('2024-03-25T09:05:00')
    expect(result).toMatch(/9:05 AM/i)
  })
  it('returns em-dash for null', () => {
    expect(formatTime(null)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats a standard INR amount', () => {
    const result = formatCurrency(50000)
    expect(result).toContain('50,000')
    expect(result).toContain('₹')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0')
  })
  it('formats null as 0', () => {
    expect(formatCurrency(null)).toContain('0')
  })
  it('formats compact notation', () => {
    const result = formatCurrency(1500000, true)
    // Should contain shorthand like 1.5M or 15L
    expect(result.length).toBeLessThan(10)
  })
  it('handles negative amounts', () => {
    const result = formatCurrency(-1000)
    expect(result).toContain('1,000')
  })
})

describe('formatNumber', () => {
  it('formats a number in en-IN style', () => {
    expect(formatNumber(1000000)).toBe('10,00,000')
  })
  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
  it('formats null as 0', () => {
    expect(formatNumber(null)).toBe('0')
  })
})

describe('hoursBetween', () => {
  it('calculates hours between two times', () => {
    const h = hoursBetween('2024-06-15T09:00:00', '2024-06-15T17:00:00')
    expect(h).toBe(8)
  })
  it('returns 0 for same time', () => {
    expect(hoursBetween('2024-06-15T09:00:00', '2024-06-15T09:00:00')).toBe(0)
  })
  it('returns 0 for null start', () => {
    expect(hoursBetween(null, '2024-06-15T17:00:00')).toBe(0)
  })
  it('returns 0 for null end', () => {
    expect(hoursBetween('2024-06-15T09:00:00', null)).toBe(0)
  })
  it('returns 0 (not negative) when end is before start', () => {
    const h = hoursBetween('2024-06-15T17:00:00', '2024-06-15T09:00:00')
    expect(h).toBe(0)
  })
  it('handles fractional hours', () => {
    const h = hoursBetween('2024-06-15T09:00:00', '2024-06-15T09:30:00')
    expect(h).toBeCloseTo(0.5)
  })
})

describe('formatHours', () => {
  it('formats whole hours', () => {
    expect(formatHours(8)).toBe('8h 0m')
  })
  it('formats fractional hours', () => {
    expect(formatHours(8.5)).toBe('8h 30m')
  })
  it('formats 0', () => {
    expect(formatHours(0)).toBe('0h 0m')
  })
  it('handles null', () => {
    expect(formatHours(null)).toBe('0h 0m')
  })
})

describe('currentPayPeriod', () => {
  it('returns YYYY-MM format for a given date', () => {
    const result = currentPayPeriod(new Date('2024-06-15'))
    expect(result).toBe('2024-06')
  })
  it('pads single-digit months', () => {
    const result = currentPayPeriod(new Date('2024-01-01'))
    expect(result).toBe('2024-01')
  })
  it('handles December', () => {
    const result = currentPayPeriod(new Date('2024-12-31'))
    expect(result).toBe('2024-12')
  })
})

describe('monthName', () => {
  it('returns month name for a period string', () => {
    expect(monthName('2024-03')).toBe('March 2024')
  })
  it('returns January for 01', () => {
    expect(monthName('2024-01')).toBe('January 2024')
  })
  it('returns December for 12', () => {
    expect(monthName('2023-12')).toBe('December 2023')
  })
})

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  it('returns true for today', () => {
    expect(isToday('2024-06-15')).toBe(true)
  })
  it('returns false for yesterday', () => {
    expect(isToday('2024-06-14')).toBe(false)
  })
  it('returns false for tomorrow', () => {
    expect(isToday('2024-06-16')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isToday(null)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isToday(undefined)).toBe(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('daysBetween', () => {
  it('returns 1 for the same day (inclusive)', () => {
    expect(daysBetween('2024-06-15', '2024-06-15')).toBe(1)
  })
  it('returns 5 for a 5-day span', () => {
    expect(daysBetween('2024-06-10', '2024-06-14')).toBe(5)
  })
  it('handles leap year Feb 29', () => {
    expect(daysBetween('2024-02-28', '2024-02-29')).toBe(2)
  })
  it('handles month boundaries', () => {
    expect(daysBetween('2024-01-30', '2024-02-02')).toBe(4)
  })
})

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  it('returns today in YYYY-MM-DD format', () => {
    expect(todayISO()).toBe('2024-06-15')
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('toDateInput', () => {
  it('returns date portion of ISO datetime', () => {
    expect(toDateInput('2024-06-15T10:30:00Z')).toBe('2024-06-15')
  })
  it('returns date string unchanged if already 10 chars', () => {
    expect(toDateInput('2024-06-15')).toBe('2024-06-15')
  })
  it('returns empty string for null', () => {
    expect(toDateInput(null)).toBe('')
  })
  it('returns empty string for undefined', () => {
    expect(toDateInput(undefined)).toBe('')
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  it('returns "about 1 hour ago" for 1 hour past', () => {
    const oneHourAgo = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000).toISOString()
    expect(timeAgo(oneHourAgo)).toContain('hour ago')
  })
  it('returns empty string for null', () => {
    expect(timeAgo(null)).toBe('')
  })
  it('returns empty string for undefined', () => {
    expect(timeAgo(undefined)).toBe('')
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
