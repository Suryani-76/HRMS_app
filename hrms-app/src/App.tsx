import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/features/auth/auth-context'
import { router } from '@/router'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SetupScreen } from '@/components/setup-screen'
import { ErrorBoundary } from '@/components/shared/error-boundary'

import { LaptopAutoCheckoutMonitor } from '@/components/shared/laptop-auto-checkout-monitor'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LaptopAutoCheckoutMonitor />
            {isSupabaseConfigured ? (
              <RouterProvider router={router} />
            ) : (
              <SetupScreen />
            )}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
