import { useEffect } from 'react'
import { STORAGE_KEY_LID_CLOSED_AT, STORAGE_KEY_LAST_HEARTBEAT } from '@/lib/laptop-auto-checkout'

/**
 * Disabled: Automatic laptop auto check-out has been removed.
 * Cleans up any leftover local storage timers so no automatic checkouts occur.
 */
export function LaptopAutoCheckoutMonitor() {
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      localStorage.removeItem(STORAGE_KEY_LAST_HEARTBEAT)
      if (typeof window !== 'undefined') {
        delete (window as any).__simulateLaptopClosed30M
      }
    } catch {
      // Ignore in non-browser envs
    }
  }, [])

  return null
}
