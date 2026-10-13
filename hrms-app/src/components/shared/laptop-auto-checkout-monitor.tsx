import { useEffect } from 'react'
import {
  STORAGE_KEY_LID_CLOSED_AT,
  STORAGE_KEY_LAST_HEARTBEAT,
  STORAGE_KEY_AUTO_CHECKOUT_EVENT,
} from '@/lib/laptop-auto-checkout'

/**
 * Disabled: Automatic laptop auto check-out has been removed.
 * Actively purges any leftover local storage timers and keys on application startup.
 */
export function LaptopAutoCheckoutMonitor() {
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_LID_CLOSED_AT)
      localStorage.removeItem(STORAGE_KEY_LAST_HEARTBEAT)
      localStorage.removeItem(STORAGE_KEY_AUTO_CHECKOUT_EVENT)
      if (typeof window !== 'undefined') {
        delete (window as any).__simulateLaptopClosed30M
      }
    } catch {
      // Ignore in non-browser envs
    }
  }, [])

  return null
}

