import { supabase } from '@/lib/supabase'
import type { Payroll, PayrollProfile, Document, Task, Announcement, Notification } from '@/lib/database.types'

// ---------- Payroll ----------
export async function fetchPayrollProfiles() {
  const { data, error } = await supabase
    .from('payroll_profiles')
    .select('*, employee:employees(first_name, last_name, employee_code, department:departments(name))')
  if (error) throw error
  return (data ?? []) as PayrollProfile[]
}

export async function fetchPayroll(period?: string) {
  let query = supabase
    .from('payroll')
    .select('*, employee:employees(first_name, last_name, employee_code, department:departments(name))')
    .order('created_at', { ascending: false })
  if (period) query = query.eq('pay_period', period)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Payroll[]
}

export async function generatePayroll(period: string) {
  const profiles = await fetchPayrollProfiles()
  const periodStart = `${period}-01`
  const periodEnd = `${period}-31`

  const { data: attendance } = await supabase
    .from('attendance')
    .select('employee_id, date, status')
    .gte('date', periodStart)
    .lte('date', periodEnd)

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('employee_id, days, leave_type:leave_types(is_paid)')
    .eq('status', 'approved')
    .gte('start_date', periodStart)
    .lte('start_date', periodEnd)
  const today = new Date()
  const totalDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate()

  const rows = profiles.map((p) => {
    const empAttendance = (attendance ?? []).filter((a) => a.employee_id === p.employee_id)
    const presentDays = empAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
    const empLeave = (leave ?? []).filter((l) => l.employee_id === p.employee_id)
    const unpaidDays = empLeave
      .filter((l) => !(l.leave_type?.[0]?.is_paid))
      .reduce((s, l) => s + (Number(l.days) || 0), 0)

    const basic = Number(p.basic_salary) || 0
    const hra = Number(p.hra) || 0
    const allowances = Number(p.allowances) || 0
    const bonus = Number(p.bonus) || 0
    const daily = totalDays > 0 ? basic / totalDays : 0
    const leaveDeduction = daily * unpaidDays
    const deductions = Number(leaveDeduction.toFixed(2))
    const pf = Number((((basic + hra) * (Number(p.pf_percent) || 0)) / 100).toFixed(2))
    const gross = basic + hra + allowances + bonus
    const tax = Number(((gross * (Number(p.tax_percent) || 0)) / 100).toFixed(2))
    const net = Number((gross - deductions - pf - tax).toFixed(2))

    return {
      employee_id: p.employee_id,
      pay_period: period,
      basic_salary: basic,
      hra,
      allowances,
      bonus,
      deductions,
      tax,
      provident_fund: pf,
      present_days: presentDays,
      total_days: totalDays,
      net_salary: net,
      status: 'generated',
      generated_at: new Date().toISOString(),
    }
  })

  const { data, error } = await supabase
    .from('payroll')
    .upsert(rows, { onConflict: 'employee_id,pay_period' })
    .select('*, employee:employees(first_name, last_name, employee_code, department:departments(name))')
  if (error) throw error
  return (data ?? []) as Payroll[]
}

export async function updatePayrollStatus(id: string, status: 'draft' | 'generated' | 'paid') {
  const patch: Partial<Payroll> = { status }
  if (status === 'paid') patch.paid_at = new Date().toISOString()
  const { data, error } = await supabase.from('payroll').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Payroll
}

// ---------- Documents ----------
export async function fetchDocuments(employeeId?: string) {
  let query = supabase
    .from('documents')
    .select('*, employee:employees(first_name, last_name, employee_code)')
    .order('created_at', { ascending: false })
  if (employeeId) query = query.eq('employee_id', employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Document[]
}

export async function uploadDocument(input: {
  employee_id: string
  name: string
  doc_type?: string
  file_url?: string
  file_size?: number
}) {
  const { data, error } = await supabase.from('documents').insert(input).select().single()
  if (error) throw error
  return data as Document
}

export async function deleteDocument(id: string) {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// ---------- Tasks ----------
export async function fetchTasks(options?: { status?: string; assigneeId?: string }) {
  let query = supabase
    .from('tasks')
    .select('*, assignee:employees(first_name, last_name, employee_code), assigner:employees(first_name, last_name)')
    .order('created_at', { ascending: false })
  if (options?.status) query = query.eq('status', options.status)
  if (options?.assigneeId) query = query.eq('assignee_id', options.assigneeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function createTask(input: {
  title: string
  description?: string
  assignee_id?: string
  due_date?: string
  priority?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id ?? null
  const { data: profile } = await supabase.from('users').select('employee_id').eq('id', userId).single()
  const { data, error } = await supabase.from('tasks').insert({ ...input, assigner_id: profile?.employee_id ?? null }).select().single()
  if (error) throw error
  return data as Task
}

export async function updateTaskStatus(id: string, status: string) {
  const { data, error } = await supabase.from('tasks').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ---------- Announcements ----------
export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, department:departments(name)')
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Announcement[]
}

export async function createAnnouncement(input: {
  title: string
  content: string
  audience?: string
  department_id?: string
  expires_at?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...input, author_id: session.session?.user.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Announcement
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

// ---------- Notifications ----------
export async function fetchNotifications(limit = 30) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) return []

  // Resolve employee_id for this user so we can match employee-addressed notifications
  const { data: profile } = await supabase
    .from('users')
    .select('employee_id')
    .eq('id', uid)
    .single()
  const employeeId = profile?.employee_id ?? null

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (employeeId) {
    query = query.or(`user_id.eq.${uid},employee_id.eq.${employeeId}`)
  } else {
    query = query.eq('user_id', uid)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { data: session } = await supabase.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) return

  const { data: profile } = await supabase
    .from('users')
    .select('employee_id')
    .eq('id', uid)
    .single()
  const employeeId = profile?.employee_id ?? null

  const filter = employeeId
    ? `user_id.eq.${uid},employee_id.eq.${employeeId}`
    : `user_id.eq.${uid}`

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(filter)
    .eq('is_read', false)
  if (error) throw error
}
