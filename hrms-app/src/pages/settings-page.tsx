import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

function ThemeOption({ value, label, icon: Icon }: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }) {
  const { theme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(value)}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent',
        theme === value && 'border-primary bg-primary/5',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export default function SettingsPage() {
  const { user, isManager, logout } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    document.title = 'Settings · Oklut HRMS'
    return () => {
      document.title = 'Oklut HRMS'
    }
  }, [])

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences and account." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Choose how Oklut HRMS looks for you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <ThemeOption value="light" label="Light" icon={Sun} />
            <ThemeOption value="dark" label="Dark" icon={Moon} />
            <ThemeOption value="system" label="System" icon={Monitor} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Account information and session controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <p className="font-medium capitalize">{user?.role?.name ?? 'Employee'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => { setRefreshing(true); window.location.reload() }} disabled={refreshing}>
                <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} /> Reload app
              </Button>
              <Button variant="destructive" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">App</CardTitle>
            <CardDescription>Information about this HRMS installation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Version</Label>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <p className="font-medium">{isManager ? 'Manager / Admin' : 'Employee'}</p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Supabase URL</Label>
              <p className="font-mono text-xs break-all">{import.meta.env.VITE_SUPABASE_URL ?? 'Not configured'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
