// ============================================================================
// Laptop Lid Close & 30-Minute Inactivity Auto Check-Out Service
//
// Automatically checks out personnel if their laptop has been closed (or the
// system has slept/suspended/stayed hidden) for 30 minutes (half an hour)
// without checking out.
// ============================================================================

import { useEffect, useCallback } from 'react'


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
 * Permanently Disabled: Automatic check-out has been completely removed per requirements.
 * Check-in and check-out ONLY occur when manually clicked by the user.
 */
export async function executeLaptopAutoCheckOut(
  _employeeId?: string,
  _closedDurationMs?: number,
  _closedAtTime?: number
): Promise<boolean> {
  // Permanently disabled: automatic checkouts are not permitted.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      localStorage.removeItem(STORAGE_KEY_LAST_HEARTBEAT)
      localStorage.removeItem(STORAGE_KEY_AUTO_CHECKOUT_EVENT)
    }
  } catch {
    // Ignore
  }
  return false
}

/**
 * Hook for laptop auto-checkout (Permanently disabled).
 * All automatic background monitoring, listeners, sleep detection, and auto-checkout timers are disabled.
 */
export function useLaptopAutoCheckout(_employeeId?: string) {
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      localStorage.removeItem(STORAGE_KEY_LAST_HEARTBEAT)
      localStorage.removeItem(STORAGE_KEY_AUTO_CHECKOUT_EVENT)
    } catch {
      // Ignore
    }
  }, [])

  const simulateAutoCheckout = useCallback(async () => {
    // No-op: automatic checkout is completely disabled
  }, [])

  return {
    simulateAutoCheckout,
    getLidStatus: getLaptopLidStatus,
  }
}

