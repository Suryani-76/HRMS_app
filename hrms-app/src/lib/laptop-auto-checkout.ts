// ============================================================================
// Laptop Lid Close & 30-Minute Inactivity Auto Check-Out Service
//
// Automatically checks out personnel if their laptop has been closed (or the
// system has slept/suspended/stayed hidden) for 30 minutes (half an hour)
// without checking out.
// ============================================================================

import { useEffect, useCallback } from 'react'
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
 * Hook for laptop auto-checkout (Disabled per user requirement).
 * All automatic background monitoring, listeners, sleep detection, and auto-checkout timers are disabled.
 */
export function useLaptopAutoCheckout(_employeeId?: string) {
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      localStorage.removeItem(STORAGE_KEY_LAST_HEARTBEAT)
    } catch {
      // Ignore
    }
  }, [])

  const simulateAutoCheckout = useCallback(async () => {
    // No-op when disabled
  }, [])

  return {
    simulateAutoCheckout,
    getLidStatus: getLaptopLidStatus,
  }
}
