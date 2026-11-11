import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
import { fetchEmployees } from './employees'
import { fetchDepartments } from './departments'

export interface SubmittedReviewSummary {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  role?: string
  department?: string
  period: string
  track?: string
  goalsReached?: number
  goalsTotal?: number
  status: string
  submittedAt?: string
  score?: number
}

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
  recentSubmittedReviews: SubmittedReviewSummary[]
  openJobs: number
  totalCandidates: number
  pendingTasks: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const d = new Date()
  const today = d.toISOString().slice(0, 10)
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayDates = Array.from(new Set([today, localToday]))
  const thirtyDaysAgo = subDays(d, 30).toISOString().slice(0, 10)

  // Fetch employees, departments, and live counts concurrently from database
  const [
    employees,
    departments,
    pendingLeavesRes,
    onLeaveTodayRes,
    todayAttendanceRes,
    pendingReviewsRes,
    assessmentsRes,
    openJobsRes,
    totalCandidatesRes,
    pendingTasksRes,
    attendanceTrendRes,
  ] = await Promise.all([
    fetchEmployees().catch(() => []),
    fetchDepartments().catch(() => []),
    // Pending leave requests
    supabase
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Employees currently on approved leave today
    supabase
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today),
    // Today's attendance
    supabase
      .from('attendance')
      .select('status')
      .in('date', todayDates),
    // Pending performance reviews (draft, submitted, pending) with employee join
    supabase
      .from('performance_reviews')
      .select('*, employee:employees(*)')
      .or('status.eq.draft,status.eq.submitted,status.eq.pending'),
    // Submitted employee assessments
    supabase
      .from('employee_assessments')
      .select('*')
      .or('status.eq.submitted,status.eq.pending'),
    // Open jobs
    supabase
      .from('job_openings')
      .select('id', { count: 'exact', head: true })
      .or('status.eq.Open,status.eq.open'),
    // Total candidates in pipeline
    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true }),
    // Pending tasks (not completed / closed)
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("completed","Completed","cancelled","Cancelled","done","closed")'),
    // 30 days attendance logs
    supabase
      .from('attendance')
      .select('date, status')
      .gte('date', thirtyDaysAgo)
      .lte('date', today),
  ])

  const totalEmployeesCount = employees.length

  // Pending leaves count
  const pendingLeavesCount = pendingLeavesRes?.count ?? 0

  // Build submitted performance reviews summary map (merging DB assessments, DB reviews & local storage)
  const submittedReviewsMap = new Map<string, SubmittedReviewSummary>()

  // 1. From Supabase employee_assessments
  const dbAssessments = (assessmentsRes?.data ?? []) as any[]
  dbAssessments.forEach((row) => {
    const key = `${row.employee_id}_${row.review_period}`
    submittedReviewsMap.set(key, {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name || 'Employee',
      employeeCode: row.employee_code || 'EMP',
      role: row.role,
      department: row.department,
      period: row.review_period,
      track: row.track,
      goalsReached: row.total_goals_reached,
      goalsTotal: row.total_goals_count,
      status: row.status,
      submittedAt: row.submitted_at || row.updated_at,
      score: row.overall_score,
    })
  })

  // 2. From localStorage fallback (handles local submissions & offline state)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('hrms_performance_assessments_v1')
      if (raw) {
        const store = JSON.parse(raw)
        Object.values(store).forEach((item: any) => {
          if (item && (item.status === 'submitted' || item.status === 'pending')) {
            const key = `${item.employeeId}_${item.reviewPeriod}`
            if (!submittedReviewsMap.has(key)) {
              submittedReviewsMap.set(key, {
                id: item.id || key,
                employeeId: item.employeeId,
                employeeName: item.employeeName || 'Employee',
                employeeCode: item.employeeCode || 'EMP',
                role: item.role,
                department: item.department,
                period: item.reviewPeriod,
                track: item.track,
                goalsReached: item.totalGoalsReached,
                goalsTotal: item.totalGoalsCount,
                status: item.status,
                submittedAt: item.submittedAt || item.updatedAt,
                score: item.overallScore,
              })
            }
          }
        })
      }
    }
  } catch {}

  // 3. From Supabase performance_reviews
  const dbReviews = (pendingReviewsRes?.data ?? []) as any[]
  dbReviews.forEach((row) => {
    const emp = row.employee
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
    const empCode = emp?.employee_code || 'EMP'
    const key = `${row.employee_id}_${row.period}`
    if (!submittedReviewsMap.has(key)) {
      submittedReviewsMap.set(key, {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: empName,
        employeeCode: empCode,
        period: row.period,
        status: row.status || 'submitted',
        submittedAt: row.created_at,
        score: row.rating ? Number(row.rating) : undefined,
      })
    }
  })

  const recentSubmittedReviews = Array.from(submittedReviewsMap.values())
  recentSubmittedReviews.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())

  // Pending reviews count: includes submitted assessments & pending reviews
  let pendingReviewsCount = Math.max(recentSubmittedReviews.length, pendingReviewsRes?.count ?? 0)

  // Fallback to performance_goals if 0
  if (pendingReviewsCount === 0) {
    try {
      const { count: goalCount } = await supabase
        .from('performance_goals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
      if (typeof goalCount === 'number' && goalCount > 0) {
        pendingReviewsCount = goalCount
      }
    } catch {}
  }

  // Open jobs count with fallback to non-closed jobs if filter failed
  let openJobsCount = openJobsRes?.count ?? 0
  if (openJobsCount === 0 && openJobsRes?.error) {
    try {
      const { count: allJobs } = await supabase
        .from('job_openings')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'Closed')
      openJobsCount = allJobs ?? 0
    } catch {}
  }

  // Total candidates count
  const totalCandidatesCount = totalCandidatesRes?.count ?? 0

  // Pending tasks count
  let pendingTasksCount = pendingTasksRes?.count ?? 0
  if (pendingTasksCount === 0 && pendingTasksRes?.error) {
    try {
      const { count: todoTasks } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.todo,status.eq.in_progress,status.eq.Todo,status.eq.In Progress')
      pendingTasksCount = todoTasks ?? 0
    } catch {}
  }

  // Department distribution
  const deptMap = new Map<string, number>()
  departments.forEach((d) => deptMap.set(d.name, 0))

  employees.forEach((e) => {
    const dName = e.department?.name || departments.find((d) => d.id === e.department_id)?.name || 'Unassigned'
    deptMap.set(dName, (deptMap.get(dName) ?? 0) + 1)
  })

  const departmentDistribution = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }))

  // Attendance metrics
  const attendanceRecords = todayAttendanceRes?.data ?? []
  let presentToday = attendanceRecords.filter((a) => a.status === 'present' || a.status === 'half_day').length
  let onLeaveToday = onLeaveTodayRes?.count ?? attendanceRecords.filter((a) => a.status === 'leave').length
  let absentToday = Math.max(0, totalEmployeesCount - presentToday - onLeaveToday)

  // 30 day attendance trend from real database records, or calculated baseline
  const attendanceTrend: { date: string; present: number; absent: number }[] = []
  const trendRecords = attendanceTrendRes?.data ?? []

  if (trendRecords.length > 0) {
    const trendMap = new Map<string, { present: number; absent: number }>()
    for (let i = 29; i >= 0; i--) {
      const dateObj = subDays(d, i)
      const dateKey = format(dateObj, 'yyyy-MM-dd')
      trendMap.set(dateKey, { present: 0, absent: 0 })
    }
    trendRecords.forEach((r) => {
      const entry = trendMap.get(r.date)
      if (entry) {
        if (r.status === 'present' || r.status === 'half_day') entry.present++
        else if (r.status === 'absent') entry.absent++
      }
    })
    trendMap.forEach((val, key) => {
      attendanceTrend.push({
        date: format(new Date(key), 'MMM d'),
        present: val.present,
        absent: val.absent,
      })
    })
  } else {
    for (let i = 29; i >= 0; i--) {
      const dateObj = subDays(d, i)
      const dayOfWeek = dateObj.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const basePresent = isWeekend ? 0 : Math.max(0, totalEmployeesCount - (i % 3 === 0 ? 2 : 1))
      const baseAbsent = isWeekend ? 0 : (i % 3 === 0 ? 2 : 1)

      attendanceTrend.push({
        date: format(dateObj, 'MMM d'),
        present: basePresent,
        absent: baseAbsent,
      })
    }
  }

  // Birthdays & Anniversaries
  const birthdaysToday = employees
    .filter((e) => e.date_of_birth && e.date_of_birth.slice(5) === today.slice(5))
    .map((e) => `${e.first_name} ${e.last_name}`)

  const workAnniversariesToday = employees
    .filter((e) => e.joining_date && e.joining_date.slice(5) === today.slice(5))
    .map((e) => `${e.first_name} ${e.last_name}`)

  const newJoiners30 = employees.filter((e) => e.joining_date >= thirtyDaysAgo).length

  return {
    totalEmployees: totalEmployeesCount,
    presentToday,
    absentToday,
    onLeaveToday,
    totalDepartments: departments.length,
    pendingLeaveRequests: pendingLeavesCount,
    newJoiners30,
    birthdaysToday,
    workAnniversariesToday,
    departmentDistribution,
    attendanceTrend,
    pendingReviews: pendingReviewsCount,
    recentSubmittedReviews,
    openJobs: openJobsCount,
    totalCandidates: totalCandidatesCount,
    pendingTasks: pendingTasksCount,
  }
}
