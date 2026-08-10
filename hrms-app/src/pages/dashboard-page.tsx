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
} from 'lucide-react'
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
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, timeAgo } from '@/lib/format'
import { TodayAttendanceCard } from '@/components/dashboard/today-attendance-card'

const DEPT_COLORS = ['#51459d', '#7c6fd6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

function ManagerDashboard() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: pendingLeaves = [] } = useLeaveRequests({ status: 'pending' })
  const { data: employees = [] } = useEmployees()

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState title="No employees yet" description="Add your first employee to get started." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {employees.slice(0, 6).map((e) => (
                <Link
                  key={e.id}
                  to={`/employees/${e.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
  )
}

function EmployeeDashboard() {
  const { employee } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: announcements = [] } = useAnnouncements()
  const { data: tasks = [] } = useTasks()

  if (!employee) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <TodayAttendanceCard employeeId={employee.id} className="lg:col-span-2" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveBalanceSummary employeeId={employee.id} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <EmptyState title="No announcements" />
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 5).map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant="secondary">{timeAgo(a.published_at)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Team Members" value={stats?.totalEmployees ?? 0} icon={Users} loading={isLoading} subtitle="Company total" />
        <StatCard title="Present Today" value={stats?.presentToday ?? 0} icon={CalendarCheck} iconClassName="bg-success/10 text-success" loading={isLoading} />
        <StatCard title="On Leave" value={stats?.onLeaveToday ?? 0} icon={CalendarX} iconClassName="bg-warning/10 text-warning" loading={isLoading} />
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
      />
      {!loading && (isManager ? <ManagerDashboard /> : <EmployeeDashboard />)}
    </div>
  )
}
