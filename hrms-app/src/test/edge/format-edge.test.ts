/**
 * EDGE CASE / RECURSIVE TESTS — format.ts
 * Tests boundary conditions, extreme values, locale edge cases.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  hoursBetween,
  formatHours,
  daysBetween,
  monthName,
  toDateInput,
} from '@/lib/format'
import { truncate } from '@/lib/utils'

describe('formatDate — edge cases', () => {
  it('handles ISO with timezone offset +05:30', () => {
    const result = formatDate('2024-03-25T00:00:00+05:30')
    // Should not throw; will parse to some date
    expect(typeof result).toBe('string')
    expect(result).not.toBe('—')
  })

  it('handles ISO with UTC Z suffix', () => {
    const result = formatDate('2024-12-31T23:59:59Z')
    expect(typeof result).toBe('string')
    expect(result).not.toBe('—')
  })

  it('handles empty string (treated as falsy)', () => {
    // empty string is falsy in JS
    expect(formatDate('')).toBe('—')
  })

  it('handles first day of year', () => {
    expect(formatDate('2024-01-01')).toBe('Jan 1, 2024')
  })

  it('handles last day of year', () => {
    expect(formatDate('2024-12-31')).toBe('Dec 31, 2024')
  })

  it('handles leap day Feb 29', () => {
    expect(formatDate('2024-02-29')).toBe('Feb 29, 2024')
  })
})

describe('hoursBetween — boundary and edge cases', () => {
  it('handles exact 24 hours (same clock 1 day apart)', () => {
    const h = hoursBetween('2024-06-15T09:00:00', '2024-06-16T09:00:00')
    expect(h).toBe(24)
  })

  it('handles overnight shift (cross midnight)', () => {
    const h = hoursBetween('2024-06-15T22:00:00', '2024-06-16T06:00:00')
    expect(h).toBe(8)
  })

  it('handles millisecond precision', () => {
    const h = hoursBetween('2024-06-15T09:00:00.000', '2024-06-15T09:00:01.000')
    expect(h).toBeCloseTo(1 / 3600)
  })

  it('returns 0 for a 1-millisecond negative difference', () => {
    const h = hoursBetween('2024-06-15T09:00:01.000', '2024-06-15T09:00:00.999')
    expect(h).toBe(0)
  })

  it('handles very long work shifts (48h)', () => {
    const h = hoursBetween('2024-06-13T09:00:00', '2024-06-15T09:00:00')
    expect(h).toBe(48)
  })
})

describe('formatHours — edge cases', () => {
  it('handles 59 minutes (rounds correctly)', () => {
    const result = formatHours(0.983333) // ~59 min
    expect(result).toBe('0h 59m')
  })

  it('handles large hours (200h)', () => {
    expect(formatHours(200)).toBe('200h 0m')
  })

  it('handles undefined input (defaults to null behavior)', () => {
    expect(formatHours(undefined)).toBe('0h 0m')
  })
})

describe('daysBetween — edge cases', () => {
  it('handles leap year Feb 28 to Mar 1 (non-leap year)', () => {
    // 2023 is not a leap year; Feb has 28 days
    expect(daysBetween('2023-02-28', '2023-03-01')).toBe(2)
  })

  it('handles leap year Feb 28 to Mar 1 (leap year 2024)', () => {
    // 2024 is a leap year; Feb has 29 days; Feb28 to Mar1 = 2 days
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(3)
  })

  it('handles year boundary (Dec 31 to Jan 1)', () => {
    expect(daysBetween('2023-12-31', '2024-01-01')).toBe(2)
  })

  it('handles large ranges (1 full year)', () => {
    // 2024 is leap year: 366 days
    expect(daysBetween('2024-01-01', '2024-12-31')).toBe(366)
  })
})

describe('monthName — boundary cases', () => {
  it('handles January (month 1)', () => {
    expect(monthName('2024-01')).toBe('January 2024')
  })

  it('handles December (month 12)', () => {
    expect(monthName('2024-12')).toBe('December 2024')
  })

  it('handles year 2000', () => {
    expect(monthName('2000-06')).toBe('June 2000')
  })
})

describe('toDateInput — edge cases', () => {
  it('handles exactly 10 chars (already just a date)', () => {
    expect(toDateInput('2024-06-15')).toBe('2024-06-15')
  })

  it('handles 11-char strings (should not trim if exactly 10 is boundary)', () => {
    // '2024-06-15X' has 11 chars, length > 10 → slice to 10
    expect(toDateInput('2024-06-15X')).toBe('2024-06-15')
  })

  it('handles undefined input', () => {
    expect(toDateInput(undefined)).toBe('')
  })
})

describe('formatCurrency — edge cases', () => {
  it('handles very large amounts (crore)', () => {
    const result = formatCurrency(10000000) // 1 crore
    expect(result).toContain('1,00,00,000')
  })

  it('handles decimal amounts (truncated by maximumFractionDigits=0)', () => {
    const result = formatCurrency(1234.99)
    // Should round to whole number
    expect(result).toContain('1,235')
  })

  it('compact mode for crores', () => {
    const result = formatCurrency(100000000, true) // 10 crore
    expect(result.length).toBeLessThan(12)
  })
})

describe('truncate — recursive/boundary tests', () => {
  it('handles string of exactly len+1 chars (must truncate)', () => {
    const str = 'a'.repeat(61)
    const result = truncate(str, 60)
    expect(result).toHaveLength(61) // 60 + '…'
    expect(result.endsWith('…')).toBe(true)
  })

  it('handles Unicode multi-byte characters', () => {
    // Each emoji is 2 code units, but charAt/slice work on code units
    const emoji = '😀'.repeat(10)
    const result = truncate(emoji, 5)
    expect(result.endsWith('…')).toBe(true)
  })

  it('handles newlines and whitespace', () => {
    const str = 'Hello\nWorld\nFoo'
    expect(truncate(str, 11)).toBe('Hello\nWorld…')
  })

  it('handles strings with only spaces', () => {
    const str = ' '.repeat(100)
    const result = truncate(str, 10)
    expect(result).toHaveLength(11)
  })
})
