import { supabase } from '@/lib/supabase'
import type { Attendance, LeaveType, LeaveRequest, LeaveBalance, Holiday } from '@/lib/database.types'

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
export async function fetchLeaveTypes() {
  const { data, error } = await supabase.from('leave_types').select('*').order('name')
  if (error) throw error
  return (data ?? []) as LeaveType[]
}

export async function fetchLeaveRequests(options?: { status?: string; employeeId?: string }) {
  let query = supabase
    .from('leave_requests')
    .select('*, employee:employees(first_name, last_name, employee_code), leave_type:leave_types(*)')
    .order('applied_at', { ascending: false })
  if (options?.status) query = query.eq('status', options.status)
  if (options?.employeeId) query = query.eq('employee_id', options.employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as LeaveRequest[]
}

export async function applyLeave(input: {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  reason?: string
}) {
  const { data, error } = await supabase.from('leave_requests').insert(input).select().single()
  if (error) throw error
  return data as LeaveRequest
}

export async function reviewLeave(id: string, status: 'approved' | 'rejected', adminComment?: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const reviewerId = sessionData.session?.user.id ?? null
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
    .select()
    .single()
  if (error) throw error
  return data as LeaveRequest
}

export async function cancelLeave(id: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as LeaveRequest
}

export async function fetchLeaveBalances(employeeId: string, year: number) {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_type:leave_types(*)')
    .eq('employee_id', employeeId)
    .eq('year', year)
  if (error) throw error
  return (data ?? []) as LeaveBalance[]
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
