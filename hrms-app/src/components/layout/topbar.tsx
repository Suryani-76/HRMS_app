import { Menu, Sun, Moon, LogOut, User, Settings, Building2, Laptop } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { NotificationCenter } from './notification-center'
import { getCurrentGeoLocation, type GeoLocationData } from '@/lib/geo-tracking'
import { LocationDetailDialog } from '@/components/attendance/location-detail-dialog'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user, employee, logout } = useAuth()

  const [currentLoc, setCurrentLoc] = useState<GeoLocationData | null>(null)
  const [locDialogOpen, setLocDialogOpen] = useState(false)

  const loadLoc = useCallback(async () => {
    try {
      const loc = await getCurrentGeoLocation()
      setCurrentLoc(loc)
    } catch {}
  }, [])

  useEffect(() => {
    loadLoc()
    const handleLocChange = () => loadLoc()
    window.addEventListener('oklut-location-mode-changed', handleLocChange)
    return () => window.removeEventListener('oklut-location-mode-changed', handleLocChange)
  }, [loadLoc])

  const isOffice = currentLoc?.isOfficeLocation ?? false

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-rose-950/40 bg-[#0a0507]/90 px-4 backdrop-blur-xl sm:px-6 shadow-sm">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center">
          {/* Prominent Login Location Badge (Visible to All Users upon Login) */}
          {currentLoc && (
            <Badge
              variant="outline"
              onClick={() => setLocDialogOpen(true)}
              className={`cursor-pointer transition-all text-xs font-semibold px-2.5 py-1 gap-1.5 shadow-xs ${
                isOffice
                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70'
                  : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/70'
              }`}
              title="Click to view Office Geofence & Location Details"
            >
              {isOffice ? (
                <>
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Office Premises</span>
                  <span className="hidden sm:inline font-normal text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                    · Hyderabad HQ
                  </span>
                </>
              ) : (
                <>
                  <Laptop className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>WFH</span>
                  <span className="hidden sm:inline font-normal text-[11px] text-amber-600/80 dark:text-amber-400/80">
                    · Work From Home
                  </span>
                </>
              )}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'maroon' : 'light')}
            aria-label="Toggle theme"
            className="hover:bg-rose-950/30 text-rose-200"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <NotificationCenter />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-full p-1 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {initials(employee?.first_name ?? user?.email?.[0], employee?.last_name ?? '')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="truncate text-sm font-medium">
                  {employee ? `${employee.first_name} ${employee.last_name}` : user?.email}
                </p>
                <p className="text-xs font-normal text-muted-foreground capitalize">{user?.role?.name ?? 'Employee'}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="mr-2 h-4 w-4" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Location Details Dialog from Topbar */}
      <LocationDetailDialog
        open={locDialogOpen}
        onOpenChange={setLocDialogOpen}
        location={
          currentLoc
            ? {
                ...currentLoc,
                employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Employee',
              }
            : null
        }
        onLocationModeChange={loadLoc}
      />
    </>
  )
}
