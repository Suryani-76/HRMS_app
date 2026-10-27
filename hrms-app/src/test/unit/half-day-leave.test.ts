import { describe, it, expect } from 'vitest'
import { getHalfDayDetails } from '@/lib/api/attendance'
import type { LeaveRequest } from '@/lib/database.types'

describe('Half Day Leave Logic & Timing', () => {
  it('correctly identifies First Half leave with timing 9:30 AM to 1:30 PM', () => {
    const request: Partial<LeaveRequest> = {
      days: 0.5,
      is_half_day: true,
      half_day_session: 'first_half',
      start_date: '2026-10-27',
      end_date: '2026-10-27',
      reason: 'Doctor appointment',
    }

    const details = getHalfDayDetails(request)
    expect(details.isHalfDay).toBe(true)
    expect(details.session).toBe('first_half')
    expect(details.sessionLabel).toBe('First Half')
    expect(details.timing).toBe('9:30 AM to 1:30 PM')
  })

  it('correctly identifies Second Half leave with timing 2:30 PM to 6:30 PM', () => {
    const request: Partial<LeaveRequest> = {
      days: 0.5,
      is_half_day: true,
      half_day_session: 'second_half',
      start_date: '2026-10-27',
      end_date: '2026-10-27',
      reason: 'Personal work in the afternoon',
    }

    const details = getHalfDayDetails(request)
    expect(details.isHalfDay).toBe(true)
    expect(details.session).toBe('second_half')
    expect(details.sessionLabel).toBe('Second Half')
    expect(details.timing).toBe('2:30 PM to 6:30 PM')
  })

  it('detects half-day session from reason tag if columns are absent', () => {
    const request: Partial<LeaveRequest> = {
      days: 0.5,
      reason: '[Half Day: Second Half (2:30 PM to 6:30 PM)] Family function',
      start_date: '2026-10-28',
      end_date: '2026-10-28',
    }

    const details = getHalfDayDetails(request)
    expect(details.isHalfDay).toBe(true)
    expect(details.session).toBe('second_half')
    expect(details.sessionLabel).toBe('Second Half')
    expect(details.timing).toBe('2:30 PM to 6:30 PM')
  })

  it('detects first half session from reason tag', () => {
    const request: Partial<LeaveRequest> = {
      days: 0.5,
      reason: '[Half Day: First Half (9:30 AM to 1:30 PM)] Morning passport renewal',
      start_date: '2026-10-28',
      end_date: '2026-10-28',
    }

    const details = getHalfDayDetails(request)
    expect(details.isHalfDay).toBe(true)
    expect(details.session).toBe('first_half')
    expect(details.sessionLabel).toBe('First Half')
    expect(details.timing).toBe('9:30 AM to 1:30 PM')
  })

  it('returns isHalfDay: false for standard full-day leaves', () => {
    const request: Partial<LeaveRequest> = {
      days: 3,
      is_half_day: false,
      start_date: '2026-10-27',
      end_date: '2026-10-29',
      reason: 'Annual vacation',
    }

    const details = getHalfDayDetails(request)
    expect(details.isHalfDay).toBe(false)
    expect(details.session).toBeNull()
    expect(details.sessionLabel).toBe('')
    expect(details.timing).toBe('')
  })
})
