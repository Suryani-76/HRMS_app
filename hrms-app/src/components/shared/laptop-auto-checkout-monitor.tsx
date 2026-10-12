import { useEffect } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { useLaptopAutoCheckout } from '@/lib/laptop-auto-checkout'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Global background listener that mounts at application root.
 * Ensures that if any authenticated employee closes their laptop for 30 minutes,
 * they are automatically checked out regardless of which route or page they are on.
 */
export function LaptopAutoCheckoutMonitor() {
  const { employee } = useAuth()
  const queryClient = useQueryClient()
  const { simulateAutoCheckout } = useLaptopAutoCheckout(employee?.id)

  useEffect(() => {
    // Expose simulation function on window for development/demo testing
    ;(window as any).__simulateLaptopClosed30M = simulateAutoCheckout

    const handleAutoCheckout = () => {
      // Invalidate attendance queries immediately across all open tabs
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats })
      if (employee?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todayAttendance(employee.id) })
      }
    }

    window.addEventListener('oklut-auto-checkout-triggered', handleAutoCheckout)
    return () => {
      window.removeEventListener('oklut-auto-checkout-triggered', handleAutoCheckout)
    }
  }, [simulateAutoCheckout, queryClient, employee?.id])

  return null
}
