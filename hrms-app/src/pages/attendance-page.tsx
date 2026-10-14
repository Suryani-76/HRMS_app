import { useMemo, useState, useEffect } from 'react'
import {
  Search,
  ClipboardList,
  ScanFace,
  ShieldCheck,
  MapPin,
  Navigation,
  Lock,
  Unlock,
  RefreshCw,
  Calendar,
  CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusPill } from '@/components/shared/status-pill'
import { TodayAttendanceCard } from '@/components/dashboard/today-attendance-card'
import { FaceIdVerificationModal } from '@/components/attendance/face-id-verification-modal'
import { LocationDetailDialog } from '@/components/attendance/location-detail-dialog'
import { useAttendanceLog, useAttendanceMonth, useEmployees, useCheckIn, useCheckOut } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate, formatHours, currentPayPeriod, monthName } from '@/lib/format'
import type { FaceVerificationResult } from '@/lib/face-biometrics'
import {
  fetchAllFaceCredentialStatuses,
  unlockFaceCredential,
  type FaceRegistryStatus,
} from '@/lib/api/faceCredentials'
import { parseGpsFromNotes, getCurrentGeoLocation, type GeoLocationData } from '@/lib/geo-tracking'
import { parseAttendanceSessions } from '@/lib/attendance-sessions'
import { getTodayDateString } from '@/lib/api/attendance'

const PAGE_SIZE = 15

// ============================================================================
// HR / ADMIN: Face ID Biometric Registry Tab
// ============================================================================
function FaceIdRegistryTab({
  employees,
  onLaunchFaceModal,
}: {
  employees: any[]
  onLaunchFaceModal: (employee: any) => void
}) {
  const [registry, setRegistry] = useState<Record<string, FaceRegistryStatus>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'locked' | 'not_registered'>('all')
  const [page, setPage] = useState(1)

  const loadRegistry = async () => {
    setLoading(true)
    try {
      const list = await fetchAllFaceCredentialStatuses()
      const map: Record<string, FaceRegistryStatus> = {}
      for (const item of list) {
        map[item.employeeId] = item
      }
      setRegistry(map)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRegistry()
  }, [])

  const handleUnlock = async (employeeId: string) => {
    await unlockFaceCredential(employeeId)
    await loadRegistry()
  }

  const enrichedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const reg = registry[emp.id]
      const status: 'registered' | 'locked' | 'not_registered' = reg
        ? reg.status === 'locked'
          ? 'locked'
          : reg.status === 'registered'
          ? 'registered'
          : 'not_registered'
        : 'not_registered'
      return {
        ...emp,
        faceStatus: status,
        registeredAt: reg?.registeredAt,
        lastVerifiedAt: reg?.lastVerifiedAt,
        failedAttempts: reg?.failedAttempts || 0,
        lockedUntil: reg?.lockedUntil,
      }
    })
  }, [employees, registry])

  const filtered = useMemo(() => {
    return enrichedEmployees.filter((emp) => {
      if (filterStatus !== 'all' && emp.faceStatus !== filterStatus) return false
      if (!search) return true
      const q = search.toLowerCase()
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
      const code = (emp.employee_code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [enrichedEmployees, filterStatus, search])

  const stats = useMemo(() => {
    const total = enrichedEmployees.length
    const registered = enrichedEmployees.filter((e) => e.faceStatus === 'registered').length
    const locked = enrichedEmployees.filter((e) => e.faceStatus === 'locked').length
    const pending = total - registered - locked
    return { total, registered, locked, pending }
  }, [enrichedEmployees])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Personnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.registered}</p>
            <p className="text-xs text-muted-foreground">Face ID Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.locked}</p>
            <p className="text-xs text-muted-foreground">Temporarily Locked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Setup Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Biometric Privacy & Protection Assurance */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-white">Biometric Template Security & Privacy Isolation</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            In compliance with biometric data protection standards, raw photographs are never stored as credentials. Biometric vectors are encrypted with AES-GCM 256-bit at rest. Administrative views display verification status and timestamps only; mathematical embeddings are never exposed.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 text-sm"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v: any) => {
            setFilterStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="not_registered">Not Registered</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadRegistry} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Registry Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Face ID Status</th>
                <th className="px-4 py-3">Registered On</th>
                <th className="px-4 py-3">Last Verified</th>
                <th className="px-4 py-3">Failed Attempts</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                    Loading biometric credential registry...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                    No matching employee biometric records found.
                  </td>
                </tr>
              ) : (
                paged.map((emp) => {
                  const fullName = `${emp.first_name} ${emp.last_name}`
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      {/* Employee details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            {emp.avatar_url && <AvatarImage src={emp.avatar_url} />}
                            <AvatarFallback className="bg-indigo-950 text-indigo-200 text-xs font-semibold">
                              {initials(emp.first_name, emp.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{fullName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {emp.employee_code && <span className="font-mono">{emp.employee_code}</span>}
                              {emp.department?.name && <span> • {emp.department.name}</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {emp.faceStatus === 'registered' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] gap-1 font-medium">
                            <ShieldCheck className="h-3 w-3" /> ✓ Registered
                          </Badge>
                        ) : emp.faceStatus === 'locked' ? (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[11px] gap-1 font-medium">
                            <Lock className="h-3 w-3" /> Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 text-[11px]">
                            Not Registered
                          </Badge>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {emp.registeredAt ? formatDate(emp.registeredAt) : '—'}
                      </td>

                      {/* Last Verified */}
                      <td className="px-4 py-3 text-xs">
                        {emp.lastVerifiedAt ? (
                          <span className="text-foreground">
                            {formatDate(emp.lastVerifiedAt)},{' '}
                            {new Date(emp.lastVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Failed Attempts */}
                      <td className="px-4 py-3 text-xs">
                        {emp.failedAttempts > 0 ? (
                          <span className="font-semibold text-rose-500">{emp.failedAttempts} / 3</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {emp.faceStatus === 'locked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlock(emp.id)}
                              className="h-7 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1"
                            >
                              <Unlock className="h-3 w-3" /> Unlock
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onLaunchFaceModal(emp)}
                            className="h-7 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1"
                          >
                            <ScanFace className="h-3 w-3" />
                            {emp.faceStatus === 'registered' ? 'Test Scan' : 'Register Face'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </div>
  )
}

// ============================================================================
// Manager Attendance Parent View (Tabs: Log & Face Registry)
// ============================================================================
function ManagerAttendance({
  onLaunchFaceModal,
}: {
  onLaunchFaceModal: (employee: any) => void
}) {
  const [activeTab, setActiveTab] = useState<'log' | 'registry'>('log')
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('month')
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [month, setMonth] = useState(currentPayPeriod())
  const [selectedDay, setSelectedDay] = useState('all')
  const [employeeId, setEmployeeId] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Location detail modal state
  const [selectedLoc, setSelectedLoc] = useState<any>(null)
  const [locDialogOpen, setLocDialogOpen] = useState(false)

  const daysInSelectedMonth = useMemo(() => {
    if (!month) return 31
    const [y, m] = month.split('-').map(Number)
    if (!y || !m) return 31
    return new Date(y, m, 0).getDate()
  }, [month])

  const queryDate = filterMode === 'date'
    ? (selectedDate || undefined)
    : selectedDay !== 'all'
      ? `${month}-${selectedDay}`
      : undefined

  const queryMonth = filterMode === 'month' && selectedDay === 'all'
    ? month
    : undefined

  const { data: employees = [] } = useEmployees()
  const { data: log = [], isLoading, isError, refetch } = useAttendanceLog({
    date: queryDate,
    month: queryMonth,
    employeeId: employeeId !== 'all' ? employeeId : undefined,
    status: status !== 'all' ? status : undefined,
  })

  const filtered = useMemo(() => {
    if (!search) return log
    const q = search.toLowerCase()
    return log.filter((a) => {
      const name = `${a.employee?.first_name ?? ''} ${a.employee?.last_name ?? ''}`.toLowerCase()
      const code = a.employee?.employee_code?.toLowerCase() ?? ''
      return name.includes(q) || code.includes(q)
    })
  }, [log, search])

  const summary = useMemo(() => {
    const present = filtered.filter((a) => a.status === 'present' || a.status === 'late').length
    const late = filtered.filter((a) => a.status === 'late').length
    const absent = filtered.filter((a) => a.status === 'absent' || !a.status).length
    return { present, late, absent }
  }, [filtered])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="log" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Attendance & GPS Log
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-2">
            <ScanFace className="h-4 w-4" /> Face ID Biometric Registry
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Attendance Log */}
        <TabsContent value="log" className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-success">{summary.present}</p>
                <p className="text-xs text-muted-foreground">Present / Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-warning">{summary.late}</p>
                <p className="text-xs text-muted-foreground">Late arrivals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{summary.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Mode Toggle: Specific Date vs Month & Year */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('date')
                  setPage(1)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === 'date'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Filter by Specific Date (Day, Month, Year)"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>Exact Date</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('month')
                  setPage(1)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterMode === 'month'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Filter by Month & Year"
              >
                <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                <span>Month & Year</span>
              </button>
            </div>

            {/* Date Pickers based on mode */}
            {filterMode === 'date' ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    if (e.target.value) {
                      setMonth(e.target.value.slice(0, 7))
                    }
                    setPage(1)
                  }}
                  className="w-44 h-9 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = getTodayDateString()
                    setSelectedDate(today)
                    setMonth(today.slice(0, 7))
                    setPage(1)
                  }}
                  className="h-9 px-2.5 text-xs"
                >
                  Today
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value)
                    setPage(1)
                  }}
                  className="w-40 h-9 text-xs"
                />
                <Select
                  value={selectedDay}
                  onValueChange={(v) => {
                    setSelectedDay(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="All days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All days</SelectItem>
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                      <SelectItem key={d} value={d}>
                        Day {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Select
              value={employeeId}
              onValueChange={(v) => {
                setEmployeeId(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : isError ? (
            <ErrorState title="Failed to load attendance" onRetry={refetch} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No records found" description="No attendance entries match your filters." />
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Sessions</th>
                        <th className="px-4 py-3">Calculated Hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Biometrics</th>
                        <th className="px-4 py-3">Location / GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((a) => {
                        const fullName = `${a.employee?.first_name ?? ''} ${a.employee?.last_name ?? ''}`.trim() || '—'
                        const hasFaceId = Boolean(a.notes?.includes('Face ID') || a.verification_method === 'FACE_ID')
                        const isFallbackPin = Boolean(a.notes?.includes('FALLBACK') || a.verification_method === 'SECURE_FALLBACK_PIN')
                        const gpsData = parseGpsFromNotes(a.notes)
                        const sessionsList = parseAttendanceSessions(a.notes, a.check_in, a.check_out, a.working_hours)
                        return (
                          <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7 text-xs">
                                  <AvatarFallback className="text-[10px]">
                                    {initials(a.employee?.first_name, a.employee?.last_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-xs leading-none">{fullName}</p>
                                  {a.employee?.employee_code && (
                                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                      {a.employee.employee_code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-medium">{formatDate(a.date)}</td>
                            <td className="px-4 py-2.5 text-xs">
                              {a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {a.check_out ? (
                                <span>{new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (a.check_in ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">On Shift</span> : '—')}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {sessionsList.length > 1 ? (
                                <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium">
                                  {sessionsList.length} Logins
                                </Badge>
                              ) : sessionsList.length === 1 ? (
                                <span className="text-[11px] text-muted-foreground">1 Login</span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{formatHours(a.working_hours)}</td>
                            <td className="px-4 py-2.5">
                              <StatusPill status={a.status ?? 'absent'} />
                            </td>
                            <td className="px-4 py-2.5">
                              {hasFaceId ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 text-[10px] gap-1 font-medium"
                                  title={a.notes || 'Verified with Face ID'}
                                >
                                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" /> Face ID
                                </Badge>
                              ) : isFallbackPin ? (
                                <Badge
                                  variant="outline"
                                  className="border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 text-[10px] gap-1 font-medium"
                                  title={a.notes || 'Verified with Fallback PIN'}
                                >
                                  Fallback PIN
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Standard</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {gpsData ? (
                                <Badge
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLoc({
                                      ...gpsData,
                                      employeeName: fullName,
                                    })
                                    setLocDialogOpen(true)
                                  }}
                                  className={`cursor-pointer text-[10px] gap-1 font-medium hover:opacity-80 transition-opacity ${
                                    gpsData.mode?.toLowerCase().includes('on-site')
                                      ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40'
                                      : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40'
                                  }`}
                                  title="Click to view GPS map and exact address"
                                >
                                  <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                                  <span className="max-w-[110px] truncate">{gpsData.locationName}</span>
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

              <LocationDetailDialog
                open={locDialogOpen}
                onOpenChange={setLocDialogOpen}
                location={selectedLoc}
              />
            </>
          )}
        </TabsContent>

        {/* TAB 2: Face ID Registry */}
        <TabsContent value="registry" className="pt-2">
          <FaceIdRegistryTab employees={employees} onLaunchFaceModal={onLaunchFaceModal} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Employee Personal Attendance View
// ============================================================================
function EmployeeAttendance() {
  const { user, employee } = useAuth()
  const { data: allEmployees = [] } = useEmployees()
  const effectiveEmployeeId = employee?.id || user?.employee_id || allEmployees[0]?.id || ''
  const [filterMode, setFilterMode] = useState<'month' | 'date'>('month')
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [month, setMonth] = useState(currentPayPeriod())
  const [selectedDay, setSelectedDay] = useState('all')

  const daysInSelectedMonth = useMemo(() => {
    if (!month) return 31
    const [y, m] = month.split('-').map(Number)
    if (!y || !m) return 31
    return new Date(y, m, 0).getDate()
  }, [month])

  const queryDate = filterMode === 'date'
    ? (selectedDate || undefined)
    : selectedDay !== 'all'
      ? `${month}-${selectedDay}`
      : undefined

  const { data: records = [], isLoading } = useAttendanceMonth(effectiveEmployeeId, month, queryDate)

  const [selectedLoc, setSelectedLoc] = useState<any>(null)
  const [locDialogOpen, setLocDialogOpen] = useState(false)

  if (!effectiveEmployeeId) {
    return <EmptyState title="Attendance Profile Loading" description="Employee record is being synchronized." />
  }

  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length
  const totalHours = records.reduce((s, r) => s + (r.working_hours ?? 0), 0)
  const lateDays = records.filter((r) => r.status === 'late').length

  return (
    <div className="space-y-4">
      <TodayAttendanceCard employeeId={effectiveEmployeeId} />

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Filter Mode Toggle: Specific Date vs Month & Year */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('date')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filterMode === 'date'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Filter by Specific Date (Day, Month, Year)"
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <span>Exact Date</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filterMode === 'month'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Filter by Month & Year"
          >
            <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
            <span>Month & Year</span>
          </button>
        </div>

        {/* Date Pickers based on mode */}
        {filterMode === 'date' ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                if (e.target.value) {
                  setMonth(e.target.value.slice(0, 7))
                }
              }}
              className="w-44 h-9 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = getTodayDateString()
                setSelectedDate(today)
                setMonth(today.slice(0, 7))
              }}
              className="h-9 px-2.5 text-xs"
            >
              Today
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40 h-9 text-xs"
            />
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All days</SelectItem>
                {Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                  <SelectItem key={d} value={d}>
                    Day {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{present}</p><p className="text-xs text-muted-foreground">Days present</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{lateDays}</p><p className="text-xs text-muted-foreground">Late arrivals</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatHours(totalHours)}</p><p className="text-xs text-muted-foreground">Total hours</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{queryDate ? `Daily Log — ${formatDate(queryDate)}` : `Monthly Log — ${monthName(month)}`}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs gap-1 font-normal">
                <ScanFace className="h-3 w-3" /> Face Verified
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs gap-1 font-normal">
                <Navigation className="h-3 w-3" /> GPS Tracked
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : records.length === 0 ? (
            <EmptyState title="No records" description={queryDate ? "No attendance record found for this date." : "No attendance records for this month yet."} icon={ClipboardList} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Calculated Hours</th>
                    <th className="px-4 py-3">Overtime</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Biometrics</th>
                    <th className="px-4 py-3">Location / GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const hasFaceId = Boolean(r.notes?.includes('Face ID') || r.verification_method === 'FACE_ID')
                    const isFallbackPin = Boolean(r.notes?.includes('FALLBACK') || r.verification_method === 'SECURE_FALLBACK_PIN')
                    const gpsData = parseGpsFromNotes(r.notes)
                    const empSessions = parseAttendanceSessions(r.notes, r.check_in, r.check_out, r.working_hours)
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{formatDate(r.date)}</td>
                        <td className="px-4 py-2.5">{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-4 py-2.5">{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (r.check_in ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">On Shift</span> : '—')}</td>
                        <td className="px-4 py-2.5">
                          {empSessions.length > 1 ? (
                            <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium">
                              {empSessions.length} Logins
                            </Badge>
                          ) : empSessions.length === 1 ? (
                            <span className="text-[11px] text-muted-foreground">1 Login</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-foreground">{formatHours(r.working_hours)}</td>
                        <td className="px-4 py-2.5">{formatHours(r.overtime_hours)}</td>
                        <td className="px-4 py-2.5"><StatusPill status={r.status ?? 'absent'} /></td>
                        <td className="px-4 py-2.5">
                          {hasFaceId ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 text-[10px] gap-1 font-medium"
                              title={r.notes || 'Verified with Face ID'}
                            >
                              <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" /> Face ID
                            </Badge>
                          ) : isFallbackPin ? (
                            <Badge
                              variant="outline"
                              className="border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 text-[10px] gap-1 font-medium"
                              title={r.notes || 'Verified with Fallback PIN'}
                            >
                              Fallback PIN
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Standard</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {gpsData ? (
                            <Badge
                              variant="outline"
                              onClick={() => {
                                setSelectedLoc({
                                  ...gpsData,
                                  employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'You',
                                })
                                setLocDialogOpen(true)
                              }}
                              className={`cursor-pointer text-[10px] gap-1 font-medium hover:opacity-80 transition-opacity ${
                                gpsData.mode?.toLowerCase().includes('on-site')
                                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40'
                                  : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40'
                              }`}
                              title="Click to view GPS map and exact address"
                            >
                              <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                              <span className="max-w-[110px] truncate">{gpsData.locationName}</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <LocationDetailDialog
        open={locDialogOpen}
        onOpenChange={setLocDialogOpen}
        location={selectedLoc}
      />
    </div>
  )
}

// ============================================================================
// Main Attendance Page Component
// ============================================================================
export default function AttendancePage() {
  const { isManager, employee, user } = useAuth()
  const { data: allEmployees = [] } = useEmployees()
  const [kioskOpen, setKioskOpen] = useState(false)
  const [kioskAction, setKioskAction] = useState<'check-in' | 'check-out'>('check-in')
  const [selectedKioskEmployee, setSelectedKioskEmployee] = useState<any>(null)
  const [kioskLocation, setKioskLocation] = useState<GeoLocationData | null>(null)

  const activeEmp = employee || allEmployees.find((e) => e.id === user?.employee_id) || allEmployees[0]
  const targetEmployee = selectedKioskEmployee || activeEmp

  const checkIn = useCheckIn()
  const checkOut = useCheckOut()

  useEffect(() => {
    if (kioskOpen) {
      getCurrentGeoLocation().then(setKioskLocation).catch(() => {})
    }
  }, [kioskOpen])

  const handleKioskVerified = async (result: FaceVerificationResult, verifiedLocation?: GeoLocationData | null) => {
    if (!targetEmployee) return
    const biometric = {
      method: (result.token?.startsWith('FALLBACK') ? 'SECURE_FALLBACK_PIN' : 'FACE_ID') as any,
      confidence: result.confidence,
      token: result.token,
      snapshotUrl: result.snapshotDataUrl,
    }
    const location = verifiedLocation || kioskLocation || undefined
    if (kioskAction === 'check-in') {
      await checkIn.mutateAsync({ employeeId: targetEmployee.id, biometric, location })
    } else {
      await checkOut.mutateAsync({ employeeId: targetEmployee.id, biometric, location })
    }
  }

  const handleLaunchFaceForEmployee = (emp: any) => {
    setSelectedKioskEmployee(emp)
    setKioskAction('check-in')
    setKioskOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Attendance & Time Tracking"
        description={
          isManager
            ? 'Monitor employee attendance logs, Face ID biometric registry, anti-spoofing verification, and GPS tracking.'
            : 'Track your daily attendance with secure biometric Face ID verification and GPS tracking.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setSelectedKioskEmployee(null)
                setKioskAction('check-in')
                setKioskOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-2"
            >
              <ScanFace className="h-4 w-4" /> Face ID Check-In
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedKioskEmployee(null)
                setKioskAction('check-out')
                setKioskOpen(true)
              }}
              className="border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 gap-2"
            >
              <ScanFace className="h-4 w-4 text-rose-500" /> Face ID Check-Out
            </Button>
          </div>
        }
      />

      {isManager ? (
        <ManagerAttendance onLaunchFaceModal={handleLaunchFaceForEmployee} />
      ) : (
        <EmployeeAttendance />
      )}

      {/* Face ID Punch Terminal Modal */}
      {targetEmployee && (
        <FaceIdVerificationModal
          open={kioskOpen}
          onOpenChange={(op) => {
            setKioskOpen(op)
            if (!op) setSelectedKioskEmployee(null)
          }}
          action={kioskAction}
          employee={{
            id: targetEmployee.id,
            first_name: targetEmployee.first_name,
            last_name: targetEmployee.last_name,
            employee_code: targetEmployee.employee_code,
            department_name: (targetEmployee.department as any)?.name || 'General',
            avatar_url: targetEmployee.avatar_url || undefined,
          }}
          currentLocation={kioskLocation}
          onVerified={handleKioskVerified}
        />
      )}
    </div>
  )
}
