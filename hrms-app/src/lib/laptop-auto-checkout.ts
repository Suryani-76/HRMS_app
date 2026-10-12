// ============================================================================
// Laptop Lid Close & 30-Minute Inactivity Auto Check-Out Service
//
// Automatically checks out personnel if their laptop has been closed (or the
// system has slept/suspended/stayed hidden) for 30 minutes (half an hour)
// without checking out.
// ============================================================================

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { checkOut, fetchTodayAttendance } from '@/lib/api/attendance'

// Half an hour in milliseconds (30 minutes = 1,800,000 ms)
export const LAPTOP_CLOSED_TIMEOUT_MS = 30 * 60 * 1000

export const STORAGE_KEY_LID_CLOSED_AT = 'oklut_laptop_lid_closed_at'
export const STORAGE_KEY_LAST_HEARTBEAT = 'oklut_laptop_last_heartbeat'
export const STORAGE_KEY_AUTO_CHECKOUT_EVENT = 'oklut_auto_checkout_triggered_at'

export interface LaptopLidStatus {
  isClosedOrHidden: boolean
  closedAt: number | null
  elapsedMinutes: number
}

/**
 * Returns current laptop closed state and elapsed time.
 */
export function getLaptopLidStatus(): LaptopLidStatus {
  const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
  const closedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT) : null
  const closedAt = closedRaw ? Number(closedRaw) : null
  const elapsedMinutes = closedAt ? Math.max(0, Math.round((Date.now() - closedAt) / 60000)) : 0

  return {
    isClosedOrHidden: isHidden || closedAt !== null,
    closedAt,
    elapsedMinutes,
  }
}

/**
 * Executes automatic check-out for the given employee.
 * Verifies that the employee is currently checked-in and not already checked out.
 */
export async function executeLaptopAutoCheckOut(
  employeeId: string,
  closedDurationMs: number = LAPTOP_CLOSED_TIMEOUT_MS,
  closedAtTime?: number
): Promise<boolean> {
  if (!employeeId) return false

  try {
    // 1. Verify that employee currently has an active, un-checked-out attendance today
    const records = await fetchTodayAttendance(employeeId)
    const activeRecord = records.find((r) => r.employee_id === employeeId)

    if (!activeRecord || !activeRecord.check_in || activeRecord.check_out) {
      // Already checked out or never checked in today
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      return false
    }

    // Determine the calculated check-out timestamp
    // If closedAtTime was captured, calculate checkout as closedAt + 30m, else current time
    const checkoutTimestamp = closedAtTime
      ? new Date(Math.min(Date.now(), closedAtTime + LAPTOP_CLOSED_TIMEOUT_MS)).toISOString()
      : new Date().toISOString()

    const minutesClosed = Math.max(30, Math.round(closedDurationMs / 60000))

    // 2. Perform the database checkout with auto-reason
    await checkOut(
      employeeId,
      { method: 'AUTO_LAPTOP_CLOSED' },
      undefined,
      {
        autoCheckoutReason: `Laptop closed for ${minutesClosed}m`,
        effectiveCheckOutTime: checkoutTimestamp,
      }
    )

    // 3. Mark auto-checkout completed and reset closed tracker
    localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
    localStorage.setItem(
      STORAGE_KEY_AUTO_CHECKOUT_EVENT,
      JSON.stringify({
        employeeId,
        timestamp: Date.now(),
        minutesClosed,
      })
    )

    // 4. Notify UI via toast and global window events
    toast.warning('Automatic Check-Out Executed', {
      description: `Your laptop was closed for over 30 minutes (${minutesClosed}m) without checking out. You have been automatically checked out.`,
      duration: 12000,
    })

    window.dispatchEvent(
      new CustomEvent('oklut-auto-checkout-triggered', {
        detail: {
          employeeId,
          timestamp: checkoutTimestamp,
          minutesClosed,
        },
      })
    )

    return true
  } catch (err) {
    console.error('Failed to execute automatic laptop checkout:', err)
    return false
  }
}

/**
 * Global React Hook that monitors laptop lid close, system sleep, and
 * tab visibility. If the laptop is closed or hidden for >= 30 minutes,
 * auto-checkout is immediately processed.
 */
export function useLaptopAutoCheckout(employeeId?: string) {
  const isExecutingRef = useRef(false)
  const lastHeartbeatRef = useRef(Date.now())

  // Trigger check and auto-checkout if criteria met
  const evaluateLidTimeout = useCallback(async (forcedDurationMs?: number) => {
    if (!employeeId || isExecutingRef.current) return

    const closedRaw = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
    if (!closedRaw && forcedDurationMs == null) return

    const closedAt = closedRaw ? Number(closedRaw) : Date.now() - (forcedDurationMs || 0)
    const elapsed = forcedDurationMs ?? (Date.now() - closedAt)

    if (elapsed >= LAPTOP_CLOSED_TIMEOUT_MS) {
      isExecutingRef.current = true
      try {
        await executeLaptopAutoCheckOut(employeeId, elapsed, closedAt)
      } finally {
        isExecutingRef.current = false
      }
    }
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) return

    // Initialize heartbeat
    lastHeartbeatRef.current = Date.now()
    localStorage.setItem(STORAGE_KEY_LAST_HEARTBEAT, String(Date.now()))

    // 1. Initial on-mount check:
    // If the laptop was closed in a previous session or laptop restarted after 30m:
    evaluateLidTimeout()

    // 2. Visibility change listener (Laptop lid closed / screen turned off / tab minimized)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Laptop lid closed or screen turned off
        const existing = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
        if (!existing) {
          localStorage.setItem(STORAGE_KEY_LID_CLOSED_AT, String(Date.now()))
        }
      } else if (document.visibilityState === 'visible') {
        // Laptop lid reopened! Check if closed for 30+ minutes
        const closedRaw = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
        if (closedRaw) {
          const closedAt = Number(closedRaw)
          const elapsed = Date.now() - closedAt
          if (elapsed >= LAPTOP_CLOSED_TIMEOUT_MS) {
            evaluateLidTimeout(elapsed)
          } else {
            // Reopened before 30 minutes (e.g. 5-10 mins) -> Reset closed timer
            localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
          }
        }
      }
    }

    // 3. Pagehide / Blur listener
    const handlePageHide = () => {
      const existing = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
      if (!existing) {
        localStorage.setItem(STORAGE_KEY_LID_CLOSED_AT, String(Date.now()))
      }
    }

    // 4. Focus listener
    const handleFocus = () => {
      const closedRaw = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
      if (closedRaw) {
        const closedAt = Number(closedRaw)
        const elapsed = Date.now() - closedAt
        if (elapsed >= LAPTOP_CLOSED_TIMEOUT_MS) {
          evaluateLidTimeout(elapsed)
        } else {
          localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
        }
      }
    }

    // 5. System Sleep / Wakeup Clock Drift Detector:
    // When a laptop lid closes, the OS enters S3/S0ix sleep and JavaScript timers halt.
    // When the laptop opens, the timer wakes up and detects the large jump in time!
    const sleepCheckInterval = setInterval(() => {
      const now = Date.now()
      const gap = now - lastHeartbeatRef.current
      lastHeartbeatRef.current = now
      localStorage.setItem(STORAGE_KEY_LAST_HEARTBEAT, String(now))

      // If gap exceeds 30 minutes, system was asleep because laptop was closed!
      if (gap >= LAPTOP_CLOSED_TIMEOUT_MS) {
        evaluateLidTimeout(gap)
      } else if (document.visibilityState === 'hidden') {
        // Connected standby / background timer execution
        const closedRaw = localStorage.getItem(STORAGE_KEY_LID_CLOSED_AT)
        if (closedRaw) {
          const closedAt = Number(closedRaw)
          if (now - closedAt >= LAPTOP_CLOSED_TIMEOUT_MS) {
            evaluateLidTimeout(now - closedAt)
          }
        }
      }
    }, 5000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('blur', handlePageHide)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(sleepCheckInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('blur', handlePageHide)
      window.removeEventListener('focus', handleFocus)
    }
  }, [employeeId, evaluateLidTimeout])

  // Simulation function for instant manual testing / demo
  const simulateAutoCheckout = useCallback(async () => {
    if (!employeeId) {
      toast.error('No logged-in employee found to simulate checkout.')
      return
    }
    toast.info('Simulating laptop closed for 30 minutes...')
    await executeLaptopAutoCheckOut(employeeId, LAPTOP_CLOSED_TIMEOUT_MS, Date.now() - LAPTOP_CLOSED_TIMEOUT_MS)
  }, [employeeId])

  return {
    simulateAutoCheckout,
    getLidStatus: getLaptopLidStatus,
  }
}
