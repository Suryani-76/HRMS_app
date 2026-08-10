import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'

export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  onLeaveToday: number
  totalDepartments: number
  pendingLeaveRequests: number
  newJoiners30: number
  birthdaysToday: string[]
  workAnniversariesToday: string[]
  departmentDistribution: { name: string; count: number }[]
  attendanceTrend: { date: string; present: number; absent: number }[]
  pendingReviews: number
  openJobs: number
  totalCandidates: number
  pendingTasks: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().slice(0, 10)

  const [employeesRes, departmentsRes, leaveRes] = await Promise.all([
    supabase.from('employees').select('id, first_name, last_name, date_of_birth, joining_date, status, department:departments(name)'),
    supabase.from('departments').select('id'),
    supabase.from('leave_requests').select('id, status, start_date, end_date').eq('status', 'pending'),
  ])

  const employees = employeesRes.data ?? []
  const departments = departmentsRes.data ?? []
  const pendingLeaves = leaveRes.data ?? []

  const { data: attendanceToday } = await supabase.from('attendance').select('employee_id, status').eq('date', today)
  const presentSet = new Set((attendanceToday ?? []).filter((a) => a.status === 'present' || a.status === 'late').map((a) => a.employee_id))

  const todayStr = today
  const activeEmployees = employees.filter((e) => e.status === 'Active' || e.status === 'active')

  const onLeaveToday = pendingLeaves.length
  const absentToday = activeEmployees.filter((e) => !presentSet.has(e.id)).length

  const birthdaysToday = employees
    .filter((e) => e.date_of_birth && e.date_of_birth.slice(5) === todayStr.slice(5))
    .map((e) => `${e.first_name} ${e.last_name}`)

  const workAnniversariesToday = employees
    .filter((e) => e.joining_date && e.joining_date.slice(5) === todayStr.slice(5))
    .map((e) => `${e.first_name} ${e.last_name}`)

  const deptMap = new Map<string, number>()
  employees.forEach((e) => {
    const name = (e as { department?: { name?: string } | null }).department?.name ?? 'Unassigned'
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1)
  })
  const departmentDistribution = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }))

  const { data: last30Attendance } = await supabase
    .from('attendance')
    .select('date, status')
    .gte('date', thirtyDaysAgo)

  const trendMap = new Map<string, { present: number; absent: number }>()
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    trendMap.set(d, { present: 0, absent: 0 })
  }
  ;(last30Attendance ?? []).forEach((a) => {
    const key = a.date
    if (trendMap.has(key)) {
      const entry = trendMap.get(key)!
      if (a.status === 'present' || a.status === 'late') entry.present += 1
      else entry.absent += 1
    }
  })
  const attendanceTrend = Array.from(trendMap.entries()).map(([date, v]) => ({
    date: format(new Date(date + 'T00:00:00'), 'MMM d'),
    present: v.present,
    absent: v.absent,
  }))

  const { count: openJobs } = await supabase
    .from('job_openings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Open')
  const { count: totalCandidates } = await supabase.from('candidates').select('id', { count: 'exact', head: true })
  const { count: pendingReviews } = await supabase
    .from('performance_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: pendingTasks } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'todo')

  return {
    totalEmployees: employees.length,
    presentToday: presentSet.size,
    absentToday,
    onLeaveToday,
    totalDepartments: departments.length,
    pendingLeaveRequests: onLeaveToday,
    newJoiners30: employees.filter((e) => e.joining_date >= thirtyDaysAgo).length,
    birthdaysToday,
    workAnniversariesToday,
    departmentDistribution,
    attendanceTrend,
    pendingReviews: pendingReviews ?? 0,
    openJobs: openJobs ?? 0,
    totalCandidates: totalCandidates ?? 0,
    pendingTasks: pendingTasks ?? 0,
  }
}
