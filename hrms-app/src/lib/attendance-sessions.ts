// ============================================================================
// Multi-Session Attendance & Cumulative Login Hours Calculator
//
// Allows employees to Check In and Check Out multiple times per day.
// Computes individual session hours and accumulates the sum of all login hours.
// ============================================================================

export interface AttendanceSession {
  checkIn: string
  checkOut?: string | null
  hours: number
}

const SESSIONS_REGEX = /\[SESSIONS:\s*(\[.*?\])\]/s

/**
 * Parses attendance sessions from the attendance record notes.
 * Gracefully falls back to primary check_in / check_out columns for legacy records.
 */
export function parseAttendanceSessions(
  notes?: string | null,
  fallbackCheckIn?: string | null,
  fallbackCheckOut?: string | null,
  fallbackHours?: number
): AttendanceSession[] {
  if (notes) {
    const match = notes.match(SESSIONS_REGEX)
    if (match && match[1]) {
      try {
        const rawList = JSON.parse(match[1])
        if (Array.isArray(rawList) && rawList.length > 0) {
          return rawList.map((item: any) => ({
            checkIn: item.in || item.checkIn,
            checkOut: item.out || item.checkOut || null,
            hours: typeof item.h === 'number' ? item.h : (typeof item.hours === 'number' ? item.hours : 0),
          }))
        }
      } catch (err) {
        console.warn('Failed to parse sessions JSON from notes:', err)
      }
    }
  }

  // Fallback for records created without session tag
  if (fallbackCheckIn) {
    const calcHours = fallbackHours != null
      ? fallbackHours
      : fallbackCheckOut
      ? Math.max(0, (new Date(fallbackCheckOut).getTime() - new Date(fallbackCheckIn).getTime()) / 36e5)
      : 0

    return [
      {
        checkIn: fallbackCheckIn,
        checkOut: fallbackCheckOut || null,
        hours: Number(calcHours.toFixed(2)),
      },
    ]
  }

  return []
}

/**
 * Serializes attendance sessions into a structured notes tag.
 */
export function formatSessionsNotesTag(sessions: AttendanceSession[]): string {
  const minimal = sessions.map((s) => ({
    in: s.checkIn,
    out: s.checkOut || null,
    h: Number((s.hours || 0).toFixed(2)),
  }))
  return `[SESSIONS: ${JSON.stringify(minimal)}]`
}

/**
 * Replaces or appends the session tag in notes string.
 */
export function updateSessionsInNotes(
  existingNotes: string | null | undefined,
  sessions: AttendanceSession[]
): string {
  const tag = formatSessionsNotesTag(sessions)
  if (!existingNotes) return tag

  if (SESSIONS_REGEX.test(existingNotes)) {
    return existingNotes.replace(SESSIONS_REGEX, tag)
  }

  return `${existingNotes} ${tag}`.trim()
}

/**
 * Calculates total worked hours across all sessions.
 * If employee is currently on shift (active check-in with no check-out),
 * the live active duration is dynamically added to the completed sessions sum!
 */
export function calculateCumulativeLoginHours(
  sessions: AttendanceSession[],
  currentCheckIn?: string | null,
  isCheckedOut?: boolean
): {
  totalHours: number
  completedHours: number
  activeSessionHours: number
  sessionCount: number
} {
  let completedHours = 0
  let activeSessionHours = 0

  for (const s of sessions) {
    if (s.checkOut) {
      completedHours += s.hours || 0
    }
  }

  // If currently active on shift
  const activeSession = sessions.find((s) => !s.checkOut)
  const activeStart = activeSession?.checkIn || currentCheckIn

  if (!isCheckedOut && activeStart) {
    const nowTime = Date.now()
    const startTime = new Date(activeStart).getTime()
    if (nowTime > startTime) {
      activeSessionHours = Math.max(0, (nowTime - startTime) / 36e5)
    }
  }

  const totalHours = Number((completedHours + activeSessionHours).toFixed(2))

  return {
    totalHours,
    completedHours: Number(completedHours.toFixed(2)),
    activeSessionHours: Number(activeSessionHours.toFixed(2)),
    sessionCount: sessions.length || (currentCheckIn ? 1 : 0),
  }
}
