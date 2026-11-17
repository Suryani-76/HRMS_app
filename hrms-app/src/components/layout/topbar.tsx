import { Menu, Sun, Moon, LogOut, User, Settings, Building2, Laptop, Check, ChevronDown, Radio, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
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
import {
  getCurrentGeoLocation,
  getSimulatedLocationMode,
  setSimulatedLocationMode,
  type GeoLocationData
} from '@/lib/geo-tracking'
import { useTodayAttendance } from '@/hooks/use-queries'
import { LocationDetailDialog } from '@/components/attendance/location-detail-dialog'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user, employee, logout } = useAuth()

  const [currentLoc, setCurrentLoc] = useState<GeoLocationData | null>(null)
  const [locDialogOpen, setLocDialogOpen] = useState(false)
  const [activeSimMode, setActiveSimMode] = useState<'auto' | 'office' | 'wfh'>(() => getSimulatedLocationMode())

  const { data: todayAttendance } = useTodayAttendance(employee?.id)
  const todayRecord = Array.isArray(todayAttendance) && employee?.id ? todayAttendance[0] : null
  const todayNotes = todayRecord?.notes || ''

  const loadLoc = useCallback(async () => {
    try {
      const loc = await getCurrentGeoLocation()
      setCurrentLoc(loc)
      setActiveSimMode(getSimulatedLocationMode())
    } catch {}
  }, [])

  useEffect(() => {
    loadLoc()
    const handleLocChange = () => {
      loadLoc()
      setActiveSimMode(getSimulatedLocationMode())
    }
    window.addEventListener('oklut-location-mode-changed', handleLocChange)
    return () => window.removeEventListener('oklut-location-mode-changed', handleLocChange)
  }, [loadLoc])

  const isOffice = useMemo(() => {
    // 1. Explicit user selection / simulation mode
    if (activeSimMode === 'office') return true
    if (activeSimMode === 'wfh') return false

    // 2. Today's attendance punch status
    if (todayNotes.includes('Mode: Office Premises') || todayNotes.includes('is_office: true')) {
      return true
    }
    if (todayNotes.includes('Mode: WFH')) {
      return false
    }

    // 3. Live geolocation detection
    if (currentLoc) {
      return currentLoc.isOfficeLocation
    }

    return false
  }, [activeSimMode, todayNotes, currentLoc])

  const handleSwitchWorkMode = (mode: 'office' | 'wfh' | 'auto') => {
    setSimulatedLocationMode(mode)
    setActiveSimMode(mode)
    if (mode === 'office') {
      toast.success('Work mode set to: Work From Office (Office Premises)')
    } else if (mode === 'wfh') {
      toast.success('Work mode set to: Work From Home (WFH)')
    } else {
      toast.success('Restored Auto GPS Geofence detection')
    }
    loadLoc()
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center">
          {/* Prominent Login Location Badge with Work Mode Switcher */}
          {currentLoc && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className={`cursor-pointer transition-all text-xs font-semibold px-2.5 py-1 gap-1.5 shadow-xs select-none hover:opacity-90 ${
                    isOffice
                      ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70'
                      : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/70'
                  }`}
                  title="Click to switch between Work From Office & WFH"
                >
                  {isOffice ? (
                    <>
                      <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Work From Office</span>
                      <span className="hidden sm:inline font-normal text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                        · Office Premises
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
                  <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                  Active Work Mode:
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleSwitchWorkMode('office')}
                  className="flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Work From Office</p>
                      <p className="text-[10px] text-muted-foreground">Office Premises · Hyderabad HQ</p>
                    </div>
                  </div>
                  {isOffice && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSwitchWorkMode('wfh')}
                  className="flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Work From Home (WFH)</p>
                      <p className="text-[10px] text-muted-foreground">Remote / Outside Office Geofence</p>
                    </div>
                  </div>
                  {!isOffice && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSwitchWorkMode('auto')}
                  className="flex items-center justify-between cursor-pointer py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">Auto Detect (GPS Geofence)</span>
                  </div>
                  {activeSimMode === 'auto' && <Check className="h-4 w-4 text-indigo-500" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocDialogOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View GPS Location & Geofence Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
                mode: isOffice ? 'Office Premises' : 'WFH',
                employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Employee',
              }
            : null
        }
        onLocationModeChange={loadLoc}
      />
    </>
  )
}
