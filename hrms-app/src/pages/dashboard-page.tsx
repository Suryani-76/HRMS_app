import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  CalendarCheck,
  CalendarX,
  Building2,
  Clock,
  UserPlus,
  Star,
  ListChecks,
  Briefcase,
  Cake,
  Calendar,
  CalendarDays,
  Megaphone,
  ChevronRight,
  MessageSquareWarning,
} from 'lucide-react'
import { format, isToday, isSameDay, parseISO } from 'date-fns'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import {
  useDashboardStats,
  useLeaveRequests,
  useEmployees,
  useAnnouncements,
  useTasks,
  useLeaveBalances,
  useMeetingHallBookings,
  useHolidays,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TodayAttendanceCard } from '@/components/dashboard/today-attendance-card'
import type { SubmittedReviewSummary } from '@/lib/api/dashboard'

const DEPT_COLORS = ['#51459d', '#7c6fd6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

function AnnouncementsCard() {
  const { data: announcements = [], isLoading } = useAnnouncements()

  const recentAnnouncements = useMemo(() => {
    return announcements.slice(0, 4)
  }, [announcements])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-indigo-500" />
          Announcements
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/announcements" className="flex items-center gap-1 text-xs">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : recentAnnouncements.length === 0 ? (
          <EmptyState title="No announcements" description="No company updates posted yet." icon={Megaphone} />
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {timeAgo(a.published_at)}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{a.content}</p>
                {a.department && (
                  <p className="text-[11px] font-medium text-indigo-600 mt-1.5">
                    {a.department.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UpcomingHolidaysCard() {
  const currentYear = new Date().getFullYear()
  const { data: holidays = [], isLoading } = useHolidays(currentYear)

  const upcomingHolidays = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const future = holidays.filter((h) => h.date >= todayStr)
    return (future.length > 0 ? future : holidays).slice(0, 4)
  }, [holidays])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-500" />
          Upcoming Holidays
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/holidays" className="flex items-center gap-1 text-xs">
            Holidays <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : upcomingHolidays.length === 0 ? (
          <EmptyState title="No holidays" description="No upcoming holidays scheduled." icon={CalendarDays} />
        ) : (
          <div className="divide-y">
            {upcomingHolidays.map((h) => {
              const hDate = parseISO(h.date)
              const today = isToday(hDate)
              return (
                <div key={h.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg ${today ? 'bg-emerald-500/10 text-emerald-600 font-bold' : 'bg-muted text-muted-foreground'}`}>
                      <span className="text-[9px] uppercase font-semibold leading-none">{format(hDate, 'MMM')}</span>
                      <span className="text-xs font-bold leading-none mt-0.5">{format(hDate, 'd')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{h.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(hDate, 'EEEE')} {today ? '· Today' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant={h.is_optional ? 'secondary' : 'success'} className="shrink-0 text-[10px]">
                    {h.is_optional ? 'Optional' : 'Public'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScheduledMeetingsCard() {
  const { data: bookings = [], isLoading } = useMeetingHallBookings()

  const upcomingBookings = useMemo(() => {
    const now = new Date()
    return bookings
      .filter((b) => b.status !== 'Rejected' && new Date(b.end_time) >= now)
      .slice(0, 4)
  }, [bookings])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          Scheduled Meetings
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/meeting-hall" className="flex items-center gap-1 text-xs">
            Meeting Hall <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : upcomingBookings.length === 0 ? (
          <EmptyState title="No scheduled meetings" description="All clear for upcoming sessions." icon={Calendar} />
        ) : (
          <div className="divide-y">
            {upcomingBookings.map((b) => {
              const startDate = new Date(b.start_time)
              const endDate = new Date(b.end_time)
              const today = isToday(startDate)
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${today ? 'bg-indigo-500/10 text-indigo-600 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{b.title}</p>
                      <p className="truncate text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 inline shrink-0" />
                        {isSameDay(startDate, endDate)
                          ? `${today ? 'Today, ' : format(startDate, 'MMM d, ')}${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`
                          : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} • ${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`}
                      </p>
                      {b.requester && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          By {b.requester.first_name} {b.requester.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={b.status === 'Approved' ? 'success' : 'warning'} className="shrink-0 text-[10px]">
                    {b.status}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SubmittedPerformanceReviewsCard({ reviews }: { reviews: SubmittedReviewSummary[] }) {
  return (
    <Card className="border-indigo-100 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            Submitted Performance Reviews
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Employee performance assessment submissions awaiting evaluation &amp; grading.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/performance" className="flex items-center gap-1 text-xs text-primary font-medium">
            Evaluate All <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <EmptyState
            title="No pending performance reviews"
            description="All employee reviews have been evaluated and finalized."
            icon={Star}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.slice(0, 5).map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700 text-xs border border-indigo-200">
                    {r.employeeName?.[0] || 'E'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.employeeName}</p>
                      <Badge variant="outline" className="text-[10px] font-mono py-0">
                        {r.employeeCode}
                      </Badge>
                      {r.track && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] py-0',
                            r.track === 'IT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          )}
                        >
                          {r.track} Track
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {r.department ? `${r.department} · ` : ''}
                      {r.period}
                      {r.goalsReached !== undefined ? ` · ${r.goalsReached}/${r.goalsTotal || 14} goals reached` : ''}
                      {r.submittedAt ? ` · ${timeAgo(r.submittedAt)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-medium">
                    Pending Evaluation
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                    <Link to="/performance">Review &amp; Grade</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ManagerDashboard() {
  const { employee, isAdmin } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: pendingLeaves = [] } = useLeaveRequests({ status: 'pending' })
  const { data: employees = [] } = useEmployees()

  return (
    <div className="space-y-6">
      {/* Attendance & Office Premises Status: only for employees and managers who require check-in / check-out, NOT for Admins */}
      {!isAdmin && employee && (
        <TodayAttendanceCard employeeId={employee.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} loading={isLoading} subtitle={`${stats?.newJoiners30 ?? 0} joined in 30 days`} />
        <StatCard title="Present Today" value={stats?.presentToday ?? 0} icon={CalendarCheck} iconClassName="bg-success/10 text-success" loading={isLoading} subtitle={`${stats?.absentToday ?? 0} absent`} />
        <StatCard title="On Leave" value={stats?.onLeaveToday ?? 0} icon={CalendarX} iconClassName="bg-warning/10 text-warning" loading={isLoading} subtitle={`${stats?.pendingLeaveRequests ?? 0} pending requests`} />
        <StatCard title="Departments" value={stats?.totalDepartments ?? 0} icon={Building2} loading={isLoading} subtitle={`${stats?.openJobs ?? 0} open positions`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.attendanceTrend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" interval={5} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#present)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#absent)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.departmentDistribution ?? []} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {stats?.departmentDistribution.map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements, Holidays & Meeting Hall Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AnnouncementsCard />
        <UpcomingHolidaysCard />
        <ScheduledMeetingsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pending Leave Requests</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leave">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <EmptyState title="No pending requests" description="All caught up!" />
            ) : (
              <div className="divide-y">
                {pendingLeaves.slice(0, 6).map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {l.employee?.first_name?.[0]}
                        {l.employee?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {l.employee?.first_name} {l.employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.leave_type?.name} · {formatDate(l.start_date)} → {formatDate(l.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{l.days} day{l.days > 1 ? 's' : ''}</Badge>
                      <Badge variant="warning">{l.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Star className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats?.pendingReviews ?? 0} pending reviews</p>
                <Link to="/performance" className="text-xs text-primary hover:underline">Review now</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats?.openJobs ?? 0} open positions</p>
                <Link to="/recruitment" className="text-xs text-primary hover:underline">Manage recruitment</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats?.pendingTasks ?? 0} pending tasks</p>
                <Link to="/tasks" className="text-xs text-primary hover:underline">View tasks</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                <Cake className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {stats?.birthdaysToday?.length ? `${stats.birthdaysToday.length} birthday(s) today` : 'No birthdays today'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.birthdaysToday?.join(', ') || (stats?.workAnniversariesToday?.length ? `${stats.workAnniversariesToday.length} work anniversary(s)` : '—')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats?.totalCandidates ?? 0} total candidates</p>
                <Link to="/recruitment" className="text-xs text-primary hover:underline">Pipeline</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submitted Performance Reviews & Recent Employees Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubmittedPerformanceReviewsCard reviews={stats?.recentSubmittedReviews ?? []} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <EmptyState title="No employees yet" description="Add your first employee to get started." />
            ) : (
              <div className="space-y-3">
                {employees.slice(0, 5).map((e) => (
                  <Link
                    key={e.id}
                    to={`/employees/${e.id}`}
                    className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
                      {e.first_name[0]}
                      {e.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.first_name} {e.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.department?.name ?? '—'} · <Clock className="inline h-3 w-3" /> {timeAgo(e.joining_date)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmployeeDashboard() {
  const { employee, isAdmin } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: tasks = [] } = useTasks()

  if (!employee) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {!isAdmin ? (
          <TodayAttendanceCard employeeId={employee.id} className="lg:col-span-2" />
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveBalanceSummary employeeId={employee.id} />
          </CardContent>
        </Card>
      </div>

      {/* Announcements, Holidays & Meeting Hall Row for Employee */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AnnouncementsCard />
        <UpcomingHolidaysCard />
        <ScheduledMeetingsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">My Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <EmptyState title="No tasks" description="You're all caught up." />
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.due_date ? `Due ${formatDate(t.due_date)}` : 'No due date'}
                      </p>
                    </div>
                    <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'secondary'}>
                      {t.priority ?? 'normal'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StatCard title="Team Members" value={stats?.totalEmployees ?? 0} icon={Users} loading={isLoading} subtitle="Company total" />
          <StatCard title="Present Today" value={stats?.presentToday ?? 0} icon={CalendarCheck} iconClassName="bg-success/10 text-success" loading={isLoading} />
          <StatCard title="On Leave" value={stats?.onLeaveToday ?? 0} icon={CalendarX} iconClassName="bg-warning/10 text-warning" loading={isLoading} />
        </div>
      </div>
    </div>
  )
}

function LeaveBalanceSummary({ employeeId }: { employeeId: string }) {
  const { data: balances } = useLeaveBalances(employeeId, new Date().getFullYear())
  if (!balances || balances.length === 0) {
    return <EmptyState title="No balances" description="Balances will appear here." />
  }
  return (
    <div className="space-y-3">
      {balances.map((b) => {
        const remaining = Math.max(0, b.allocated - b.used)
        const pct = b.allocated > 0 ? Math.min(100, (remaining / b.allocated) * 100) : 0
        return (
          <div key={b.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{b.leave_type?.name}</span>
              <span className="text-muted-foreground">{remaining} left</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { isManager, loading } = useAuth()
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting} 👋`}
        description="Here's what's happening across the organization today."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-2 shadow-xs border-amber-200/80 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900">
            <Link to="/complaints">
              <MessageSquareWarning className="h-4 w-4 text-amber-600" />
              Complaint Box
            </Link>
          </Button>
        }
      />
      {!loading && (isManager ? <ManagerDashboard /> : <EmployeeDashboard />)}
    </div>
  )
}
