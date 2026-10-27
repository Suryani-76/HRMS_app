import { supabase } from '@/lib/supabase'
import type { Attendance, LeaveType, LeaveRequest, LeaveBalance, Holiday } from '@/lib/database.types'
import { formatGpsNotesTag, type GeoLocationData } from '@/lib/geo-tracking'
import {
  parseAttendanceSessions,
  updateSessionsInNotes,
  calculateCumulativeLoginHours,
  type AttendanceSession,
} from '@/lib/attendance-sessions'

export * from '@/lib/attendance-sessions'
export type { GeoLocationData } from '@/lib/geo-tracking'

// ---------- Attendance ----------
export function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


export async function fetchTodayAttendance(employeeId?: string) {
  const localToday = getTodayDateString()
  const utcToday = new Date().toISOString().slice(0, 10)
  const dates = Array.from(new Set([localToday, utcToday]))
  let query = supabase.from('attendance').select('*').in('date', dates)
  if (employeeId) query = query.eq('employee_id', employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Attendance[]
}

function getMonthDateRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, '0')}`,
  }
}

export async function fetchAttendanceMonth(employeeId: string, month: string, date?: string) {
  let query = supabase
    .from('attendance')
    .select('*, employee:employees(first_name, last_name, employee_code)')
    .eq('employee_id', employeeId)

  if (date) {
    query = query.eq('date', date)
  } else {
    const { start, end } = getMonthDateRange(month)
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query.order('date')
  if (error) throw error
  return (data ?? []) as Attendance[]
}

export async function fetchAttendanceLog(options?: { date?: string; month?: string; employeeId?: string; status?: string }) {
  try {
    let query = supabase
      .from('attendance')
      .select('*, employee:employees(id, first_name, last_name, employee_code, department_id, department:departments!department_id(name))')
      .order('date', { ascending: false })
      .limit(500)

    if (options?.date) {
      query = query.eq('date', options.date)
    } else if (options?.month) {
      const { start, end } = getMonthDateRange(options.month)
      query = query.gte('date', start).lte('date', end)
    }
    if (options?.employeeId && options.employeeId !== 'all') query = query.eq('employee_id', options.employeeId)
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)

    const { data, error } = await query
    if (!error && data) {
      return data as Attendance[]
    }
    if (error) {
      console.warn('fetchAttendanceLog error with join, falling back:', error.message)
      let fallbackQuery = supabase
        .from('attendance')
        .select('*, employee:employees(id, first_name, last_name, employee_code, department_id)')
        .order('date', { ascending: false })
        .limit(500)
      if (options?.date) {
        fallbackQuery = fallbackQuery.eq('date', options.date)
      } else if (options?.month) {
        const { start, end } = getMonthDateRange(options.month)
        fallbackQuery = fallbackQuery.gte('date', start).lte('date', end)
      }
      if (options?.employeeId && options.employeeId !== 'all') fallbackQuery = fallbackQuery.eq('employee_id', options.employeeId)
      if (options?.status && options.status !== 'all') fallbackQuery = fallbackQuery.eq('status', options.status)
      const res = await fallbackQuery
      return (res.data ?? []) as Attendance[]
    }
    return (data ?? []) as Attendance[]
  } catch (err) {
    console.error('fetchAttendanceLog exception:', err)
    return []
  }
}

export interface BiometricVerificationInfo {
  method?: 'FACE_ID' | 'MANUAL' | 'SECURE_FALLBACK_PIN' | string
  confidence?: number
  token?: string
  snapshotUrl?: string
}

export async function checkIn(
  employeeId: string,
  biometric?: BiometricVerificationInfo,
  location?: GeoLocationData
) {
  const now = new Date().toISOString()
  const localToday = getTodayDateString()
  const utcToday = now.slice(0, 10)
  const hour = new Date().getHours()
  const status = hour >= 10 ? 'late' : 'present'

  const verificationMethod = biometric?.method || (biometric?.token ? 'FACE_ID' : 'MANUAL')
  const verificationStatus = 'VERIFIED'

  const biometricTag = biometric?.token
    ? `[Face ID In: ${biometric.confidence ?? 98}% match | Ref: ${biometric.token}]`
    : null
  const gpsTag = location ? formatGpsNotesTag(location) : null
  const notesTag = [biometricTag, gpsTag].filter(Boolean).join(' ') || null

  // Look for any existing record for today (matching local date or UTC date)
  const { data: existingRecords } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .in('date', Array.from(new Set([localToday, utcToday])))
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingRecords?.[0]

  if (existing) {
    // If the employee had checked out or is checking in again in the same day:
    const existingSessions = parseAttendanceSessions(
      existing.notes,
      existing.check_in,
      existing.check_out,
      existing.working_hours
    )

    // Check if previously checked out or if all sessions are closed
    const hasUnclosed = existingSessions.some((s) => !s.checkOut)
    if (!hasUnclosed || existing.check_out) {
      existingSessions.push({
        checkIn: now,
        checkOut: null,
        hours: 0,
      })
    }

    // Preserve the cumulative sum of earlier completed sessions
    const { completedHours } = calculateCumulativeLoginHours(existingSessions, now, false)

    const baseNotes = notesTag
      ? (existing.notes ? `${existing.notes} | ${notesTag}` : notesTag)
      : existing.notes
    const notesWithSessions = updateSessionsInNotes(baseNotes, existingSessions)

    const updateFields: any = {
      check_in: now,
      check_out: null,
      working_hours: completedHours,
      status: (!existing.status || existing.status === 'absent') ? status : existing.status,
      notes: notesWithSessions,
      updated_at: now,
      verification_method: verificationMethod,
      verification_status: verificationStatus,
    }

    let { data, error } = await supabase
      .from('attendance')
      .update(updateFields)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      // Fallback if optional schema columns not present
      delete updateFields.verification_method
      delete updateFields.verification_status
      const fallbackRes = await supabase
        .from('attendance')
        .update(updateFields)
        .eq('id', existing.id)
        .select()
        .single()
      if (fallbackRes.error) throw fallbackRes.error
      data = fallbackRes.data
    }

    if (biometric?.token || location) {
      try {
        await supabase.from('audit_logs').insert({
          action: location ? 'GPS_CHECK_IN' : 'FACE_ID_CHECK_IN',
          entity_name: 'attendance',
          details: {
            employee_id: employeeId,
            token: biometric?.token,
            confidence: biometric?.confidence,
            latitude: location?.latitude,
            longitude: location?.longitude,
            accuracy: location?.accuracy,
            address: location?.address,
            city: location?.city,
            work_mode: location?.workMode,
            is_office: location?.isOfficeLocation,
            map_url: location?.mapUrl,
            check_in: now,
            session_count: existingSessions.length,
          },
        })
      } catch {}
    }

    return data as Attendance
  }

  const initialSessions: AttendanceSession[] = [
    {
      checkIn: now,
      checkOut: null,
      hours: 0,
    },
  ]
  const notesWithSessions = updateSessionsInNotes(notesTag, initialSessions)

  const insertPayload: any = {
    employee_id: employeeId,
    date: localToday,
    check_in: now,
    status,
    notes: notesWithSessions,
    working_hours: 0,
    overtime_hours: 0,
    verification_method: verificationMethod,
    verification_status: verificationStatus,
  }

  let { data, error } = await supabase
    .from('attendance')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    // Retry without optional columns if column does not exist remotely
    delete insertPayload.verification_method
    delete insertPayload.verification_status
    const retryRes = await supabase
      .from('attendance')
      .insert(insertPayload)
      .select()
      .single()
    if (retryRes.error) throw retryRes.error
    data = retryRes.data
  }

  if (biometric?.token || location) {
    try {
      await supabase.from('audit_logs').insert({
        action: location ? 'GPS_CHECK_IN' : 'FACE_ID_CHECK_IN',
        entity_name: 'attendance',
        details: {
          employee_id: employeeId,
          token: biometric?.token,
          confidence: biometric?.confidence,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy,
          address: location?.address,
          city: location?.city,
          work_mode: location?.workMode,
          is_office: location?.isOfficeLocation,
          map_url: location?.mapUrl,
          check_in: now,
        },
      })
    } catch {}
  }

  return data as Attendance
}

export interface CheckOutOptions {
  autoCheckoutReason?: string
  effectiveCheckOutTime?: string
}

export async function checkOut(
  employeeId: string,
  biometric?: BiometricVerificationInfo,
  location?: GeoLocationData,
  options?: CheckOutOptions
) {
  const now = options?.effectiveCheckOutTime || new Date().toISOString()
  const localToday = getTodayDateString()
  const utcToday = now.slice(0, 10)

  const { data: existingRecords } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .in('date', Array.from(new Set([localToday, utcToday])))
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingRecords?.[0]
  if (!existing) throw new Error('No check-in found for today')

  // Parse all sessions for today
  const existingSessions = parseAttendanceSessions(
    existing.notes,
    existing.check_in,
    existing.check_out,
    existing.working_hours
  )

  // Find the active session (where checkOut is null) or last session
  let activeIndex = existingSessions.findIndex((s) => !s.checkOut)
  if (activeIndex === -1) {
    existingSessions.push({
      checkIn: existing.check_in || existing.created_at || now,
      checkOut: now,
      hours: 0,
    })
    activeIndex = existingSessions.length - 1
  }

  const currentSession = existingSessions[activeIndex]
  const sessionStart = new Date(currentSession.checkIn || existing.check_in || existing.created_at).getTime()
  const nowTime = new Date(now).getTime()
  let sessionDiff = (nowTime - sessionStart) / 36e5

  if (sessionDiff < 0 && existing.created_at) {
    const createdTime = new Date(existing.created_at).getTime()
    sessionDiff = Math.max(0, (nowTime - createdTime) / 36e5)
  }
  if (sessionDiff < 0) sessionDiff = 0

  currentSession.checkOut = now
  currentSession.hours = Number(sessionDiff.toFixed(2))

  // Calculate sum of ALL login session hours for today
  const totalWorked = Number(
    existingSessions.reduce((sum, s) => sum + (s.hours || 0), 0).toFixed(2)
  )
  const overtime = Math.max(0, Number((totalWorked - 9).toFixed(2)))

  const outBiometricTag = biometric?.token
    ? `[Face ID Out: ${biometric.confidence ?? 98}% match | Ref: ${biometric.token}]`
    : null
  const outGpsTag = location
    ? formatGpsNotesTag(location).replace('[GPS:', '[GPS Out:')
    : null
  const autoTag = options?.autoCheckoutReason
    ? `[Auto-Checkout: ${options.autoCheckoutReason}]`
    : null
  const outNotesTag = [outBiometricTag, outGpsTag, autoTag].filter(Boolean).join(' ') || null

  const combinedNotes = outNotesTag
    ? (existing.notes ? `${existing.notes} | ${outNotesTag}` : outNotesTag)
    : existing.notes

  const notesWithSessions = updateSessionsInNotes(combinedNotes, existingSessions)

  const updatePayload: Record<string, unknown> = {
    check_out: now,
    working_hours: totalWorked,
    overtime_hours: overtime,
    notes: notesWithSessions,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('attendance')
    .update(updatePayload)
    .eq('id', existing.id)
    .select()
    .single()
  if (error) throw error

  if (biometric?.token || location || options?.autoCheckoutReason) {
    try {
      await supabase.from('audit_logs').insert({
        action: options?.autoCheckoutReason
          ? 'AUTO_CHECKOUT_LAPTOP_CLOSED'
          : (location ? 'GPS_CHECK_OUT' : 'FACE_ID_CHECK_OUT'),
        entity_name: 'attendance',
        details: {
          employee_id: employeeId,
          auto_reason: options?.autoCheckoutReason,
          token: biometric?.token,
          confidence: biometric?.confidence,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy,
          address: location?.address,
          city: location?.city,
          work_mode: location?.workMode,
          is_office: location?.isOfficeLocation,
          map_url: location?.mapUrl,
          check_out: now,
          working_hours: totalWorked,
        },
      })
    } catch {}
  }

  return data as Attendance
}

export async function setBreak(employeeId: string, action: 'in' | 'out') {
  const now = new Date().toISOString()
  const localToday = getTodayDateString()
  const utcToday = now.slice(0, 10)

  const { data: existingRecords } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .in('date', Array.from(new Set([localToday, utcToday])))
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingRecords?.[0]
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
  const { data, error } = await supabase.from('leave_types').select('*').order('name')
  if (error) {
    console.error('fetchLeaveTypes error:', error)
    return []
  }
  return (data ?? []) as LeaveType[]
}

export async function fetchLeaveRequests(options?: { status?: string; employeeId?: string }): Promise<LeaveRequest[]> {
  try {
    let query = supabase
      .from('leave_requests')
      .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments!department_id(name)), leave_type:leave_types(*)')
      .order('applied_at', { ascending: false })
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)
    if (options?.employeeId) query = query.eq('employee_id', options.employeeId)
    const { data, error } = await query

    if (!error && data !== null) {
      return data as LeaveRequest[]
    }
    
    // Fallback direct select without join if relationship error
    const res = await supabase.from('leave_requests').select('*').order('applied_at', { ascending: false })
    return (res.data ?? []) as LeaveRequest[]
  } catch (err) {
    console.error('fetchLeaveRequests error:', err)
    return []
  }
}

export interface HalfDayInfo {
  isHalfDay: boolean
  session: 'first_half' | 'second_half' | null
  sessionLabel: string
  timing: string
}

export function getHalfDayDetails(r: Partial<LeaveRequest>): HalfDayInfo {
  const isHalfDay = Boolean(
    r.is_half_day ||
    r.days === 0.5 ||
    (r.reason && (r.reason.includes('Half Day') || r.reason.includes('first_half') || r.reason.includes('second_half') || r.reason.includes('9.30') || r.reason.includes('9:30') || r.reason.includes('2.30') || r.reason.includes('2:30')))
  )

  if (!isHalfDay) {
    return {
      isHalfDay: false,
      session: null,
      sessionLabel: '',
      timing: '',
    }
  }

  const isSecondHalf =
    r.half_day_session === 'second_half' ||
    Boolean(r.reason && (r.reason.toLowerCase().includes('second half') || r.reason.includes('second_half') || r.reason.includes('2.30') || r.reason.includes('2:30') || r.reason.includes('afternoon')))

  if (isSecondHalf) {
    return {
      isHalfDay: true,
      session: 'second_half',
      sessionLabel: 'Second Half',
      timing: '2:30 PM to 6:30 PM',
    }
  }

  return {
    isHalfDay: true,
    session: 'first_half',
    sessionLabel: 'First Half',
    timing: '9:30 AM to 1:30 PM',
  }
}

export async function applyLeave(input: {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  reason?: string
  status?: 'pending' | 'approved' | 'rejected'
  isAdmin?: boolean
  isHr?: boolean
  is_half_day?: boolean
  half_day_session?: 'first_half' | 'second_half' | string
}) {
  let validEmpId = input.employee_id
  if (!validEmpId || validEmpId === '00000000-0000-0000-0000-000000000010') {
    const { data: session } = await supabase.auth.getSession()
    const email = session.session?.user?.email
    if (email) {
      const { data: emp } = await supabase.from('employees').select('id').ilike('email', email).maybeSingle()
      if (emp?.id) validEmpId = emp.id
    }
    if (!validEmpId || validEmpId === '00000000-0000-0000-0000-000000000010') {
      const { data: anyEmp } = await supabase.from('employees').select('id').limit(1).maybeSingle()
      if (anyEmp?.id) validEmpId = anyEmp.id
    }
  }

  const isRoleAdmin = input.isAdmin || input.status === 'approved'
  const finalStatus = isRoleAdmin ? 'approved' : (input.status || 'pending')

  const payload: Record<string, unknown> = {
    employee_id: validEmpId,
    leave_type_id: input.leave_type_id,
    start_date: input.start_date,
    end_date: input.end_date,
    days: input.days,
    reason: input.reason || null,
    status: finalStatus,
    admin_comment: isRoleAdmin ? 'Self-approved by Admin / CEO' : null,
    reviewed_at: isRoleAdmin ? new Date().toISOString() : null,
    is_half_day: input.is_half_day ?? (input.days === 0.5),
    half_day_session: input.half_day_session || null,
  }

  let data: any = null
  let error: any = null

  const attempt = await supabase
    .from('leave_requests')
    .insert(payload)
    .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments!department_id(name)), leave_type:leave_types(*)')
    .single()

  if (attempt.error && (attempt.error.message?.includes('is_half_day') || attempt.error.code === '42703')) {
    delete payload.is_half_day
    delete payload.half_day_session
    const retry = await supabase
      .from('leave_requests')
      .insert(payload)
      .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments!department_id(name)), leave_type:leave_types(*)')
      .single()
    data = retry.data
    error = retry.error
  } else {
    data = attempt.data
    error = attempt.error
  }

  if (error) throw error

  // Notify admins and HRs for pending requests:
  // - When an employee applies: visible ONLY to HR's and Admin portal (never to regular employees)
  // - When an HR applies: visible ONLY to Admin portal
  if (finalStatus === 'pending' && data) {
    try {
      let isApplicantHR = Boolean(input.isHr)
      if (!isApplicantHR) {
        const { data: sessionData } = await supabase.auth.getSession()
        const userEmail = sessionData?.session?.user?.email
        const userId = sessionData?.session?.user?.id

        const getRoleName = (r: unknown): string => {
          if (!r) return ''
          if (Array.isArray(r)) return (r[0] as { name?: string })?.name || ''
          return (r as { name?: string })?.name || ''
        }

        if (userId || userEmail) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('id, role:roles!inner(name)')
            .or(`id.eq.${userId || ''},email.ilike.${userEmail || ''}`)
            .maybeSingle()
          if (getRoleName(userProfile?.role).toUpperCase() === 'HR') {
            isApplicantHR = true
          }
        }

        if (!isApplicantHR && validEmpId) {
          const { data: empUser } = await supabase
            .from('users')
            .select('id, role:roles!inner(name)')
            .eq('employee_id', validEmpId)
            .maybeSingle()
          if (getRoleName(empUser?.role).toUpperCase() === 'HR') {
            isApplicantHR = true
          }
        }
      }

      // If HR applied: target only Admin. If Employee applied: target Admin and HR.
      const targetRoleNames = isApplicantHR ? ['Admin'] : ['Admin', 'HR']

      const { data: recipients } = await supabase
        .from('users')
        .select('id, role:roles!inner(name)')
        .in('role.name', targetRoleNames)

      const empData = (data as any)?.employee
      const empName = empData
        ? `${empData.first_name || ''} ${empData.last_name || ''}`.trim()
        : 'Employee'

      if (recipients && recipients.length > 0) {
        const notifRows = recipients.map((r) => ({
          user_id: r.id,
          type: 'info' as const,
          title: `New Leave Request`,
          message: `${empName || 'Employee'} requested ${input.days} day(s) of leave (${input.start_date} to ${input.end_date}). Reason: ${input.reason || 'None'}`,
          link: '/leave',
          is_read: false,
        }))
        await supabase.from('notifications').insert(notifRows)
      }
    } catch (e) {
      console.error('Failed to dispatch leave notification:', e)
    }
  }

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
    .select('*, employee:employees(first_name, last_name, employee_code, department_id, department:departments!department_id(name)), leave_type:leave_types(*)')
    .single()

  if (error) throw error

  // Note: Database trigger trg_leave_status_changed automatically updates leave_balances.used when status is approved
  // Send notification to the applicant
  if (data?.employee_id) {
    try {
      await supabase.from('notifications').insert({
        employee_id: data.employee_id,
        type: status === 'approved' ? 'success' : 'warning',
        title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request for ${data.leave_type?.name || 'Leave'} (${data.start_date} to ${data.end_date}) has been ${status}${adminComment ? `. Note: ${adminComment}` : ''}.`,
        link: '/leave',
        is_read: false,
      })
    } catch {}
  }

  return data as LeaveRequest
}

export async function cancelLeave(id: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as LeaveRequest
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

    // Auto-allocate balances if none exist for this year
    const { data: types } = await supabase.from('leave_types').select('*')
    if (types && types.length > 0) {
      const inserts = types.map((t) => ({
        employee_id: employeeId,
        leave_type_id: t.id,
        year,
        allocated: t.days_per_year,
        used: 0,
      }))
      const { data: created } = await supabase
        .from('leave_balances')
        .insert(inserts)
        .select('*, leave_type:leave_types(*)')
      if (created) return created as LeaveBalance[]
    }
  } catch (err) {
    console.error('fetchLeaveBalances error:', err)
  }

  return []
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

  // Create broadcast notification for all users
  try {
    const formattedDate = new Date(input.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    await supabase.from('notifications').insert({
      type: 'info',
      title: `Upcoming Holiday: ${input.name}`,
      message: `${input.is_optional ? 'Optional' : 'Company'} Holiday on ${formattedDate}: ${input.name}`,
      link: '/holidays',
      is_read: false,
    })
  } catch (err) {
    console.warn('Holiday notification creation skipped:', err)
  }

  return data as Holiday
}

export async function deleteHoliday(id: string) {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}
