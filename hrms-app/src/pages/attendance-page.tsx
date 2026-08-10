import { useMemo, useState } from 'react'
import { Search, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusPill } from '@/components/shared/status-pill'
import { TodayAttendanceCard } from '@/components/dashboard/today-attendance-card'
import { useAttendanceLog, useAttendanceMonth, useEmployees } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate, formatHours, currentPayPeriod, monthName } from '@/lib/format'

const PAGE_SIZE = 15

function ManagerAttendance() {
  const [month, setMonth] = useState(currentPayPeriod())
  const [employeeId, setEmployeeId] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: employees = [] } = useEmployees()
  const { data: log = [], isLoading, isError, refetch } = useAttendanceLog({
    month,
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{summary.present}</p><p className="text-xs text-muted-foreground">Present / Late</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{summary.late}</p><p className="text-xs text-muted-foreground">Late arrivals</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{summary.absent}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1) }}
          className="sm:w-44"
        />
        <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setPage(1) }}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : paged.length === 0 ? (
        <EmptyState title="No attendance records" description={`No records for ${monthName(month)}.`} />
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(a.employee?.first_name, a.employee?.last_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-xs">{a.employee?.first_name} {a.employee?.last_name}</p>
                            <p className="text-[11px] text-muted-foreground">{a.employee?.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">{formatDate(a.date)}</td>
                      <td className="px-4 py-2.5">{a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5">{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5">{formatHours(a.working_hours)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={a.status ?? 'absent'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

function EmployeeAttendance() {
  const { employee } = useAuth()
  const [month, setMonth] = useState(currentPayPeriod())
  const { data: records = [], isLoading } = useAttendanceMonth(employee?.id ?? '', month)

  if (!employee) return null

  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length
  const totalHours = records.reduce((s, r) => s + (r.working_hours ?? 0), 0)
  const lateDays = records.filter((r) => r.status === 'late').length

  return (
    <div className="space-y-4">
      <TodayAttendanceCard employeeId={employee.id} />

      <div className="flex items-center gap-2">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{present}</p><p className="text-xs text-muted-foreground">Days present</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{lateDays}</p><p className="text-xs text-muted-foreground">Late arrivals</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatHours(totalHours)}</p><p className="text-xs text-muted-foreground">Total hours</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Log — {monthName(month)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : records.length === 0 ? (
            <EmptyState title="No records" description="No attendance records for this month yet." icon={ClipboardList} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Break</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Overtime</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{formatDate(r.date)}</td>
                      <td className="px-4 py-2.5">{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5">{r.break_in ? (r.break_out ? formatHours((new Date(r.break_out).getTime() - new Date(r.break_in).getTime()) / 36e5) : 'Active') : '—'}</td>
                      <td className="px-4 py-2.5">{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-2.5">{formatHours(r.working_hours)}</td>
                      <td className="px-4 py-2.5">{formatHours(r.overtime_hours)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.status ?? 'absent'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AttendancePage() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader title="Attendance" description={isManager ? 'Monitor employee attendance across the organization.' : 'Track your daily attendance.'} />
      {isManager ? <ManagerAttendance /> : <EmployeeAttendance />}
    </div>
  )
}
