import { supabase } from '@/lib/supabase'
import type { Payroll, PayrollProfile, Document, Task, Announcement, Notification } from '@/lib/database.types'
import { mergeAndEnrichDocuments, saveLocalProjectDoc, removeLocalProjectDoc } from './projectDocuments'

// ---------- Payroll ----------
export async function fetchPayrollProfiles() {
  const { data, error } = await supabase
    .from('payroll_profiles')
    .select('*, employee:employees(*, department:departments!department_id(name), designation:designations(name))')
  
  if (error) {
    const fallback = await supabase
      .from('payroll_profiles')
      .select('*, employee:employees(first_name, last_name, employee_code, department:departments!department_id(name))')
    if (fallback.error) throw fallback.error
    return (fallback.data ?? []) as PayrollProfile[]
  }

  // Also query active employees to see if any are missing a payroll profile
  try {
    const { data: activeEmps } = await supabase
      .from('employees')
      .select('*, department:departments!department_id(name), designation:designations(name)')
      .eq('status', 'Active')
      .order('first_name', { ascending: true })

    if (activeEmps && activeEmps.length > 0) {
      const existingMap = new Map((data ?? []).map((p) => [p.employee_id, p]))
      const merged: PayrollProfile[] = [...((data ?? []) as PayrollProfile[])]

      for (const emp of activeEmps) {
        if (!existingMap.has(emp.id)) {
          merged.push({
            employee_id: emp.id,
            basic_salary: Number(emp.basic_salary) || 0,
            hra: Number(emp.hra) || 0,
            allowances: Number(emp.allowances) || 0,
            bonus: Number(emp.bonus) || 0,
            pf_percent: 12,
            tax_percent: 5,
            bank_name: emp.bank_name || null,
            bank_account: emp.bank_account_number || null,
            ifsc_code: emp.ifsc_code || null,
            updated_at: emp.updated_at || new Date().toISOString(),
            employee: emp as any,
          })
        } else {
          const prof = existingMap.get(emp.id)!
          if ((!prof.basic_salary || prof.basic_salary === 0) && Number(emp.basic_salary) > 0) {
            prof.basic_salary = Number(emp.basic_salary)
            prof.hra = Number(emp.hra) || prof.hra || 0
            prof.allowances = Number(emp.allowances) || prof.allowances || 0
            prof.bonus = Number(emp.bonus) || prof.bonus || 0
          }
        }
      }
      return merged
    }
  } catch (syncErr) {
    console.warn('fetchPayrollProfiles active employees sync notice:', syncErr)
  }

  return (data ?? []) as PayrollProfile[]
}

export async function fetchPayroll(period?: string) {
  let query = supabase
    .from('payroll')
    .select('*, employee:employees(*, department:departments!department_id(name), designation:designations(name))')
    .order('created_at', { ascending: false })
  if (period) query = query.eq('pay_period', period)
  const { data, error } = await query
  if (error) {
    const fallback = await supabase
      .from('payroll')
      .select('*, employee:employees(first_name, last_name, employee_code, department:departments!department_id(name))')
      .order('created_at', { ascending: false })
    if (period) fallback.eq('pay_period', period)
    const res = await fallback
    if (res.error) throw res.error
    return (res.data ?? []) as Payroll[]
  }
  return (data ?? []) as Payroll[]
}

export async function generatePayroll(period: string) {
  const profiles = await fetchPayrollProfiles()
  const [y, m] = period.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const periodStart = `${period}-01`
  const periodEnd = `${period}-${String(lastDay).padStart(2, '0')}`

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
  const totalDays = lastDay

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

  // Ensure profiles are stored in payroll_profiles table
  for (const p of profiles) {
    supabase.from('payroll_profiles').upsert({
      employee_id: p.employee_id,
      basic_salary: Number(p.basic_salary) || 0,
      hra: Number(p.hra) || 0,
      allowances: Number(p.allowances) || 0,
      bonus: Number(p.bonus) || 0,
      pf_percent: Number(p.pf_percent) || 12,
      tax_percent: Number(p.tax_percent) || 5,
      bank_name: p.bank_name || null,
      bank_account: p.bank_account || null,
      ifsc_code: p.ifsc_code || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_id' }).catch(() => {})
  }

  const { data, error } = await supabase
    .from('payroll')
    .upsert(rows, { onConflict: 'employee_id,pay_period' })
    .select('*, employee:employees(*, department:departments!department_id(name), designation:designations(name))')
  if (error) throw error
  return (data ?? []) as Payroll[]
}

export async function clearPayroll(period?: string) {
  let query = supabase.from('payroll').delete()
  if (period) {
    query = query.eq('pay_period', period)
  } else {
    query = query.neq('id', '00000000-0000-0000-0000-000000000000')
  }
  const { error } = await query
  if (error) throw error
  return { success: true }
}

export async function deletePayrollRow(id: string) {
  const { error } = await supabase.from('payroll').delete().eq('id', id)
  if (error) throw error
  return { success: true }
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
  const remoteDocs = (data ?? []) as Document[]
  return mergeAndEnrichDocuments(remoteDocs, employeeId)
}

export async function uploadDocument(input: {
  employee_id: string
  name: string
  doc_type?: string
  file_url?: string
  file_size?: number
  project_id?: string | null
  project_name?: string | null
  project_code?: string | null
}) {
  let created: Document
  try {
    const { data, error } = await supabase.from('documents').insert(input).select('*, employee:employees(first_name, last_name, employee_code)').single()
    if (error) {
      // Fallback: If project columns don't exist yet on remote table, tag inside name
      if (input.project_id || input.project_code || input.project_name) {
        const tag = ` [PRJ:${JSON.stringify({ id: input.project_id, code: input.project_code, name: input.project_name })}]`
        const fallbackInput = {
          employee_id: input.employee_id,
          name: input.name + tag,
          doc_type: input.doc_type,
          file_url: input.file_url,
          file_size: input.file_size,
        }
        const { data: fbData, error: fbError } = await supabase.from('documents').insert(fallbackInput).select('*, employee:employees(first_name, last_name, employee_code)').single()
        if (fbError) throw fbError
        created = fbData as Document
      } else {
        throw error
      }
    } else {
      created = data as Document
    }
  } catch (err) {
    throw err
  }

  // Ensure project properties are present and mirror to local storage
  if (input.project_id || input.project_code || input.project_name) {
    const enriched: Document = {
      ...created,
      name: input.name, // Clean name
      project_id: input.project_id || created.project_id,
      project_name: input.project_name || created.project_name,
      project_code: input.project_code || created.project_code,
    }
    saveLocalProjectDoc(enriched)
    return enriched
  }
  return created
}

export async function deleteDocument(id: string) {
  removeLocalProjectDoc(id)
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// ---------- Tasks ----------
export async function fetchTasks(options?: { status?: string; assigneeId?: string }) {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:employees!assignee_id(id, first_name, last_name, employee_code, department:departments!department_id(name)),
      assigner:employees!assigner_id(id, first_name, last_name, employee_code)
    `)
    .order('created_at', { ascending: false })
  if (options?.status) query = query.eq('status', options.status)
  if (options?.assigneeId) query = query.eq('assignee_id', options.assigneeId)
  const { data, error } = await query
  let tasks: Task[] = []
  if (error) {
    const { data: fallback } = await supabase
      .from('tasks')
      .select('*, assignee:employees!assignee_id(id, first_name, last_name, employee_code), assigner:employees!assigner_id(id, first_name, last_name)')
      .order('created_at', { ascending: false })
    tasks = (fallback ?? []) as Task[]
  } else {
    tasks = (data ?? []) as Task[]
  }

  // Enrich tasks with team_lead_id, member_ids, and project_code from metadata
  return tasks.map((t) => {
    if (t.department_sector && t.department_sector.startsWith('{')) {
      try {
        const meta = JSON.parse(t.department_sector)
        if (meta.lead) t.team_lead_id = meta.lead
        if (meta.members) t.member_ids = meta.members
        if (meta.prj && !t.project_id) t.project_id = meta.prj
        if (meta.code) t.project_code = meta.code
      } catch {
        // ignore
      }
    }
    return t
  })
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toSafeUuid(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed || trimmed === 'all' || trimmed === 'none') return null
  return UUID_REGEX.test(trimmed) ? trimmed : null
}

export async function createTask(input: {
  title: string
  description?: string
  assignee_id?: string
  team_lead_id?: string
  member_ids?: string[]
  due_date?: string
  priority?: string
  project_id?: string
  project_code?: string
  department_id?: string
  department_sector?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const rawUserId = session.session?.user.id
  const userId = toSafeUuid(rawUserId)

  let profile: { employee_id: string | null } | null = null
  if (userId) {
    try {
      const { data } = await supabase.from('users').select('employee_id').eq('id', userId).maybeSingle()
      profile = data
    } catch {
      // ignore
    }
  }

  // 1. Resolve assignee_id (support UUID or employee_code)
  let assigneeId = toSafeUuid(input.assignee_id)
  if (!assigneeId && input.assignee_id && typeof input.assignee_id === 'string' && input.assignee_id.trim()) {
    const rawCode = input.assignee_id.trim()
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .or(`employee_code.eq.${rawCode},id.eq.${rawCode}`)
        .maybeSingle()
      if (emp?.id && toSafeUuid(emp.id)) {
        assigneeId = emp.id
      }
    } catch {
      // ignore
    }
  }

  // Double-check assignee exists in employees table to prevent FK violation
  if (assigneeId) {
    try {
      const { data: empCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', assigneeId)
        .maybeSingle()
      if (!empCheck) {
        assigneeId = null
      }
    } catch {
      // ignore
    }
  }

  // Resolve Team Lead ID
  let resolvedLeadId = toSafeUuid(input.team_lead_id) || assigneeId
  if (resolvedLeadId) {
    try {
      const { data: leadCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', resolvedLeadId)
        .maybeSingle()
      if (!leadCheck) {
        resolvedLeadId = null
      }
    } catch {
      // ignore
    }
  }

  // Sanitize member IDs (N members)
  const safeMemberIds = (input.member_ids || [])
    .map((m) => toSafeUuid(m))
    .filter(Boolean) as string[]

  // Primary assignee is the designated Team Lead or first member
  const primaryAssigneeId = resolvedLeadId || (safeMemberIds.length > 0 ? safeMemberIds[0] : assigneeId)

  // 2. Validate department_id exists in remote DB to prevent foreign key errors
  let deptId = toSafeUuid(input.department_id)
  if (deptId) {
    try {
      const { data: dept } = await supabase.from('departments').select('id').eq('id', deptId).maybeSingle()
      if (!dept) deptId = null
    } catch {
      deptId = null
    }
  }

  // 3. Validate assigner_id exists in remote DB
  let assignerId = toSafeUuid(profile?.employee_id)
  if (assignerId) {
    try {
      const { data: empCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', assignerId)
        .maybeSingle()
      if (!empCheck) assignerId = null
    } catch {
      assignerId = null
    }
  }

  // Encode project, project_code, lead, and team members in department_sector metadata JSON
  let deptSector = input.department_sector || null
  const meta: Record<string, any> = {}
  if (input.project_id && input.project_id !== 'none') meta.prj = input.project_id
  if (input.project_code) meta.code = input.project_code
  if (resolvedLeadId) meta.lead = resolvedLeadId
  if (safeMemberIds.length > 0) meta.members = safeMemberIds
  if (deptSector && !deptSector.startsWith('{')) meta.sector = deptSector

  if (Object.keys(meta).length > 0) {
    deptSector = JSON.stringify(meta)
  }

  const payload: any = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assignee_id: primaryAssigneeId,
    assigner_id: assignerId,
    due_date: input.due_date || null,
    priority: input.priority || 'medium',
    status: 'todo',
    department_id: deptId,
    department_sector: deptSector,
  }

  let taskData: Task | null = null

  // Attempt 1: Full insert with assignee relationship joined
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('*, assignee:employees!assignee_id(id, first_name, last_name, employee_code, user_id)')
    .single()

  if (error) {
    // Attempt 2: Simple insert without complex join
    const { data: simpleData, error: simpleErr } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single()

    if (simpleErr) {
      // Attempt 3: Fallback stripping department columns in case of constraint
      const { department_id, department_sector, ...safeInput } = payload
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('tasks')
        .insert(safeInput)
        .select()
        .single()
      if (fallbackErr) throw fallbackErr
      taskData = fallbackData as Task
    } else {
      taskData = simpleData as Task
    }
  } else {
    taskData = data as Task
  }

  // Dispatch notifications to the Team Lead and all assigned team members
  const allNotifTargetIds = Array.from(
    new Set([primaryAssigneeId, resolvedLeadId, ...safeMemberIds].filter(Boolean) as string[])
  )

  for (const empTargetId of allNotifTargetIds) {
    try {
      const { data: empUser } = await supabase
        .from('users')
        .select('id')
        .eq('employee_id', empTargetId)
        .maybeSingle()

      await supabase.from('notifications').insert({
        user_id: empUser?.id ?? null,
        employee_id: empTargetId,
        type: 'info',
        title: 'New Task Assigned: ' + input.title,
        message: input.description || `You have been assigned to task: "${input.title}"`,
        link: '/tasks',
        is_read: false,
      })
    } catch (e) {
      console.warn('Task notification creation skipped:', e)
    }
  }

  return taskData as Task
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

  // Create broadcast notification for all users
  try {
    const snippet = input.content.length > 120 ? input.content.slice(0, 120) + '...' : input.content
    await supabase.from('notifications').insert({
      type: 'info',
      title: `New Announcement: ${input.title}`,
      message: snippet,
      link: '/announcements',
      is_read: false,
    })
  } catch (err) {
    console.warn('Announcement notification creation skipped:', err)
  }

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

  // Resolve employee_id and role for this user so we can match employee-addressed notifications
  const { data: profile } = await supabase
    .from('users')
    .select('employee_id, role:roles(name)')
    .eq('id', uid)
    .single()
  const employeeId = profile?.employee_id ?? null
  const roleName = ((profile as any)?.role?.name ?? '').toUpperCase()

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (employeeId) {
    query = query.or(`user_id.eq.${uid},employee_id.eq.${employeeId},user_id.is.null`)
  } else {
    query = query.or(`user_id.eq.${uid},user_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw error
  let items = (data ?? []) as Notification[]

  // Security & visibility filtering:
  // - When an employee applies for leave, the notification is visible ONLY to HR's and Admin portal (never to regular employees).
  // - When an HR applies for leave, the notification is visible ONLY to Admin portal.
  if (roleName !== 'ADMIN' && roleName !== 'HR') {
    // Regular employees must NOT see leave request notifications
    items = items.filter((n) => !n.title?.toLowerCase().includes('new leave request'))
  } else if (roleName === 'HR') {
    // HR only sees leave request notifications explicitly addressed to them (user_id === uid)
    items = items.filter((n) => {
      if (n.title?.toLowerCase().includes('new leave request')) {
        return n.user_id === uid
      }
      return true
    })
  }

  return items
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
    ? `user_id.eq.${uid},employee_id.eq.${employeeId},user_id.is.null`
    : `user_id.eq.${uid},user_id.is.null`

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(filter)
    .eq('is_read', false)
  if (error) throw error
}
