import { supabase } from '@/lib/supabase'
import type { Attendance, LeaveType, LeaveRequest, LeaveBalance, Holiday, Employee } from '@/lib/database.types'
import { INITIAL_LEAVE_TYPES, INITIAL_LEAVE_REQUESTS, INITIAL_LEAVE_BALANCES, INITIAL_EMPLOYEES } from '@/lib/seed-data'

const LEAVE_TYPES_KEY = 'hrms_local_leave_types'
const LEAVE_REQUESTS_KEY = 'hrms_local_leave_requests'
const LEAVE_BALANCES_KEY = 'hrms_local_leave_balances'

function getLocal<T>(key: string, defaultVal: T[]): T[] {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {}
  return defaultVal
}

function setLocal<T>(key: string, val: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

// ---------- Attendance ----------
export async function fetchTodayAttendance(employeeId?: string) {
  const today = new Date().toISOString().slice(0, 10)
  let query = supabase.from('attendance').select('*').eq('date', today)
  if (employeeId) query = query.eq('employee_id', employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Attendance[]
}

export async function fetchAttendanceMonth(employeeId: string, month: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employee:employees(first_name, last_name, employee_code)')
    .eq('employee_id', employeeId)
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`)
    .order('date')
  if (error) throw error
  return (data ?? []) as Attendance[]
}

export async function fetchAttendanceLog(options?: { month?: string; employeeId?: string; status?: string }) {
  let query = supabase
    .from('attendance')
    .select('*, employee:employees(first_name, last_name, employee_code, department:departments(name))')
    .order('date', { ascending: false })
    .limit(500)

  if (options?.month) {
    query = query.gte('date', `${options.month}-01`).lte('date', `${options.month}-31`)
  }
  if (options?.employeeId) query = query.eq('employee_id', options.employeeId)
  if (options?.status) query = query.eq('status', options.status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Attendance[]
}

export async function checkIn(employeeId: string) {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const hour = new Date().getHours()
  const status = hour >= 10 ? 'late' : 'present'
  const { data, error } = await supabase
    .from('attendance')
    .insert({ employee_id: employeeId, date: today, check_in: now, status })
    .select()
    .single()
  if (error) throw error
  return data as Attendance
}

export async function checkOut(employeeId: string) {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()
  if (!existing) throw new Error('No check-in found for today')

  const working = Math.max(0, (new Date(now).getTime() - new Date(existing.check_in).getTime()) / 36e5)
  const overtime = Math.max(0, working - 9)
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out: now, working_hours: Number(working.toFixed(2)), overtime_hours: Number(overtime.toFixed(2)) })
    .eq('id', existing.id)
    .select()
    .single()
  if (error) throw error
  return data as Attendance
}

export async function setBreak(employeeId: string, action: 'in' | 'out') {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()
  if (!existing) throw new Error('No check-in found for today')

  const update: Partial<Attendance> = action === 'in' ? { break_in: now } : { break_out: now }
  const { data, error } = await supabase
    .from('attendance')
    .update(update)
    .eq('id', existing.id)
    .select()
    .single()
  if (error) throw error
  return data as Attendance
}

// ---------- Leave ----------
export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  try {
    const { data, error } = await supabase.from('leave_types').select('*').order('name')
    if (!error && data && data.length > 0) {
      setLocal(LEAVE_TYPES_KEY, data)
      return data as LeaveType[]
    }
  } catch {}
  return getLocal<LeaveType>(LEAVE_TYPES_KEY, INITIAL_LEAVE_TYPES)
}

export async function fetchLeaveRequests(options?: { status?: string; employeeId?: string }): Promise<LeaveRequest[]> {
  try {
    let query = supabase
      .from('leave_requests')
      .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments(name)), leave_type:leave_types(*)')
      .order('applied_at', { ascending: false })
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)
    if (options?.employeeId) query = query.eq('employee_id', options.employeeId)
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      setLocal(LEAVE_REQUESTS_KEY, data)
      return data as LeaveRequest[]
    }
  } catch {}

  let requests = getLocal<LeaveRequest>(LEAVE_REQUESTS_KEY, INITIAL_LEAVE_REQUESTS)
  if (options?.status && options.status !== 'all') {
    requests = requests.filter((r) => (r.status ?? 'pending').toLowerCase() === options.status?.toLowerCase())
  }
  if (options?.employeeId) {
    requests = requests.filter((r) => r.employee_id === options.employeeId)
  }
  return requests
}

export async function applyLeave(input: {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  reason?: string
}) {
  let created: LeaveRequest | null = null
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(input)
      .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments(name)), leave_type:leave_types(*)')
      .single()
    if (!error && data) created = data as LeaveRequest
  } catch {}

  const employees = getLocal<Employee>('hrms_local_employees', INITIAL_EMPLOYEES)
  const types = getLocal<LeaveType>(LEAVE_TYPES_KEY, INITIAL_LEAVE_TYPES)
  const emp = employees.find((e) => e.id === input.employee_id)
  const lt = types.find((t) => t.id === input.leave_type_id)

  if (!created) {
    created = {
      ...input,
      id: 'leave-' + Date.now(),
      status: 'pending',
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: emp ?? null,
      leave_type: lt ?? null,
    } as unknown as LeaveRequest
  }

  const current = getLocal<LeaveRequest>(LEAVE_REQUESTS_KEY, INITIAL_LEAVE_REQUESTS)
  setLocal(LEAVE_REQUESTS_KEY, [created, ...current])

  // Send notification to Admin / CEO
  try {
    const isHrOrManager =
      emp?.department?.name === 'Human Resources' ||
      emp?.department?.name === 'HR' ||
      emp?.designation?.name?.includes('Manager') ||
      emp?.designation?.name?.includes('Executive')

    await supabase.from('notifications').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      type: 'info',
      title: isHrOrManager ? `New Leave Request from HR: ${emp?.first_name} ${emp?.last_name}` : `New Leave Request: ${emp?.first_name} ${emp?.last_name}`,
      message: `${emp?.first_name} ${emp?.last_name} (${emp?.department?.name || 'Employee'}) requested ${input.days} day(s) of ${lt?.name || 'Leave'} (${input.start_date} to ${input.end_date}). Reason: ${input.reason || 'No reason provided'}`,
      link: '/leave',
      is_read: false,
    })
  } catch {}

  return created
}

export async function reviewLeave(id: string, status: 'approved' | 'rejected', adminComment?: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const reviewerId = sessionData.session?.user.id ?? null

  let updated: LeaveRequest | null = null
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        admin_comment: adminComment ?? null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments(name)), leave_type:leave_types(*)')
      .single()
    if (!error && data) updated = data as LeaveRequest
  } catch {}

  const current = getLocal<LeaveRequest>(LEAVE_REQUESTS_KEY, INITIAL_LEAVE_REQUESTS)
  const item = current.find((r) => r.id === id)
  if (!updated && item) {
    updated = {
      ...item,
      status,
      admin_comment: adminComment ?? null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  if (updated) {
    const nextRequests = current.map((r) => (r.id === id ? updated! : r))
    setLocal(LEAVE_REQUESTS_KEY, nextRequests)

    // Update leave balance used days if approved
    if (status === 'approved') {
      const balances = getLocal<LeaveBalance>(LEAVE_BALANCES_KEY, INITIAL_LEAVE_BALANCES)
      const empId = updated.employee_id
      const typeId = updated.leave_type_id
      const days = Number(updated.days) || 0
      const nextBalances = balances.map((b) => {
        if (b.employee_id === empId && b.leave_type_id === typeId) {
          return { ...b, used: b.used + days }
        }
        return b
      })
      setLocal(LEAVE_BALANCES_KEY, nextBalances)
    }

    // Send notification to the applicant
    try {
      if (updated.employee_id) {
        await supabase.from('notifications').insert({
          employee_id: updated.employee_id,
          type: status === 'approved' ? 'success' : 'warning',
          title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'} by Admin/CEO`,
          message: `Your leave request for ${updated.leave_type?.name || 'Leave'} (${updated.start_date} to ${updated.end_date}) has been ${status}${adminComment ? `. Note: ${adminComment}` : ''}.`,
          link: '/leave',
          is_read: false,
        })
      }
    } catch {}

    return updated
  }

  return { id, status } as unknown as LeaveRequest
}

export async function cancelLeave(id: string) {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return data as LeaveRequest
  } catch {}

  const current = getLocal<LeaveRequest>(LEAVE_REQUESTS_KEY, INITIAL_LEAVE_REQUESTS)
  const next = current.map((r) => (r.id === id ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() } : r))
  setLocal(LEAVE_REQUESTS_KEY, next)
  return next.find((r) => r.id === id)!
}

export async function fetchLeaveBalances(employeeId: string, year: number): Promise<LeaveBalance[]> {
  try {
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*, leave_type:leave_types(*)')
      .eq('employee_id', employeeId)
      .eq('year', year)
    if (!error && data && data.length > 0) {
      return data as LeaveBalance[]
    }
  } catch {}

  const types = getLocal<LeaveType>(LEAVE_TYPES_KEY, INITIAL_LEAVE_TYPES)
  const balances = getLocal<LeaveBalance>(LEAVE_BALANCES_KEY, INITIAL_LEAVE_BALANCES)
  const empBalances = balances.filter((b) => b.employee_id === employeeId && b.year === year)

  if (empBalances.length > 0) return empBalances

  // Generate initial balances for this employee if none exist yet
  const generated: LeaveBalance[] = types.map((t) => ({
    id: `bal-${employeeId}-${t.id}`,
    employee_id: employeeId,
    leave_type_id: t.id,
    year,
    allocated: t.days_per_year,
    used: 0,
    created_at: new Date().toISOString(),
    leave_type: t,
  }))

  setLocal(LEAVE_BALANCES_KEY, [...balances, ...generated])
  return generated
}

// ---------- Holidays ----------
export async function fetchHolidays(year?: number) {
  let query = supabase.from('holidays').select('*').order('date')
  if (year) query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Holiday[]
}

export async function createHoliday(input: { name: string; date: string; is_optional?: boolean }) {
  const { data, error } = await supabase.from('holidays').insert(input).select().single()
  if (error) throw error
  return data as Holiday
}

export async function deleteHoliday(id: string) {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}
