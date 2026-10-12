import { describe, it, expect } from 'vitest'
import {
  parseAttendanceSessions,
  formatSessionsNotesTag,
  updateSessionsInNotes,
  calculateCumulativeLoginHours,
  type AttendanceSession,
} from '@/lib/attendance-sessions'

describe('Multi-Session Attendance & Login Hours Calculation', () => {
  it('parses fallback session for legacy records without session tag', () => {
    const checkIn = '2026-10-08T09:00:00.000Z'
    const checkOut = '2026-10-08T17:00:00.000Z'
    const sessions = parseAttendanceSessions(null, checkIn, checkOut, 8.0)

    expect(sessions).toHaveLength(1)
    expect(sessions[0].checkIn).toBe(checkIn)
    expect(sessions[0].checkOut).toBe(checkOut)
    expect(sessions[0].hours).toBe(8.0)
  })

  it('correctly calculates cumulative hours for multiple completed sessions in a single day', () => {
    // Employee logged in 09:00 - 12:00 (3h), then 13:00 - 18:00 (5h)
    const sessions: AttendanceSession[] = [
      {
        checkIn: '2026-10-08T09:00:00.000Z',
        checkOut: '2026-10-08T12:00:00.000Z',
        hours: 3.0,
      },
      {
        checkIn: '2026-10-08T13:00:00.000Z',
        checkOut: '2026-10-08T18:00:00.000Z',
        hours: 5.0,
      },
    ]

    const result = calculateCumulativeLoginHours(sessions, null, true)
    expect(result.totalHours).toBe(8.0)
    expect(result.completedHours).toBe(8.0)
    expect(result.sessionCount).toBe(2)
    expect(result.activeSessionHours).toBe(0)
  })

  it('correctly calculates hours across 3 sessions', () => {
    // Morning session: 2.5h, Afternoon session: 3.5h, Evening session: 2.0h -> Total: 8.0h
    const sessions: AttendanceSession[] = [
      {
        checkIn: '2026-10-08T08:30:00.000Z',
        checkOut: '2026-10-08T11:00:00.000Z',
        hours: 2.5,
      },
      {
        checkIn: '2026-10-08T12:30:00.000Z',
        checkOut: '2026-10-08T16:00:00.000Z',
        hours: 3.5,
      },
      {
        checkIn: '2026-10-08T17:00:00.000Z',
        checkOut: '2026-10-08T19:00:00.000Z',
        hours: 2.0,
      },
    ]

    const result = calculateCumulativeLoginHours(sessions, null, true)
    expect(result.totalHours).toBe(8.0)
    expect(result.sessionCount).toBe(3)
  })

  it('serializes and parses sessions in notes string', () => {
    const originalSessions: AttendanceSession[] = [
      {
        checkIn: '2026-10-08T09:00:00.000Z',
        checkOut: '2026-10-08T12:00:00.000Z',
        hours: 3.0,
      },
      {
        checkIn: '2026-10-08T13:00:00.000Z',
        checkOut: '2026-10-08T18:00:00.000Z',
        hours: 5.0,
      },
    ]

    const notes = updateSessionsInNotes('[Face ID In: 98% match]', originalSessions)
    expect(notes).toContain('[SESSIONS:')
    expect(notes).toContain('[Face ID In: 98% match]')

    const parsed = parseAttendanceSessions(notes)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].hours).toBe(3.0)
    expect(parsed[1].hours).toBe(5.0)
  })
})
