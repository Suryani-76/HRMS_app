import { supabase } from '@/lib/supabase'
import type { PerformanceGoal, PerformanceReview, JobOpening, Candidate, Interview, Offer, AuditLog, MeetingHallBooking } from '@/lib/database.types'

// ---------- Performance ----------
export async function fetchPerformanceGoals(employeeId?: string) {
  try {
    let query = supabase
      .from('performance_goals')
      .select('*, employee:employees(first_name, last_name, employee_code)')
      .order('created_at', { ascending: false })
    if (employeeId) query = query.eq('employee_id', employeeId)
    const { data, error } = await query
    if (!error && data) return data as PerformanceGoal[]
  } catch (err) {
    console.error('fetchPerformanceGoals error:', err)
  }
  return []
}

export async function createGoal(input: {
  employee_id: string
  title: string
  description?: string
  target?: string
  due_date?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('performance_goals')
    .insert({ ...input, reviewer_id: session.session?.user.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as PerformanceGoal
}

export async function updateGoalStatus(id: string, status: string) {
  const { data, error } = await supabase.from('performance_goals').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data as PerformanceGoal
}

export async function fetchPerformanceReviews(employeeId?: string) {
  try {
    let query = supabase
      .from('performance_reviews')
      .select('*, employee:employees(first_name, last_name, employee_code)')
      .order('created_at', { ascending: false })
    if (employeeId) query = query.eq('employee_id', employeeId)
    const { data, error } = await query
    if (!error && data) return data as PerformanceReview[]
  } catch (err) {
    console.error('fetchPerformanceReviews error:', err)
  }
  return []
}

export async function createReview(input: {
  employee_id: string
  period: string
  goals?: string
  rating?: number
  comments?: string
  cycle_level?: number
}) {
  const { data: session } = await supabase.auth.getSession()
  const basePayload = {
    employee_id: input.employee_id,
    period: input.period,
    goals: input.goals || null,
    rating: input.rating || null,
    comments: input.comments || null,
    reviewer_id: session.session?.user.id ?? null,
    status: 'submitted',
    review_date: new Date().toISOString().slice(0, 10),
  }
  const fullPayload = {
    ...basePayload,
    cycle_level: input.cycle_level || 1,
  }

  let { data, error } = await supabase.from('performance_reviews').insert(fullPayload).select().single()
  if (error) {
    const fallbackRes = await supabase.from('performance_reviews').insert(basePayload).select().single()
    data = fallbackRes.data
    error = fallbackRes.error
  }
  if (error) throw error
  return data as PerformanceReview
}

// ---------- Recruitment ----------
export async function fetchJobOpenings(options?: { status?: string }) {
  try {
    let query = supabase
      .from('job_openings')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false })
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)
    const { data, error } = await query
    if (!error && data) return data as JobOpening[]
  } catch (err) {
    console.error('fetchJobOpenings error:', err)
  }
  return []
}

export async function createJobOpening(input: {
  title: string
  department_id?: string
  designation_id?: string
  openings_count: number
  location?: string
  job_type?: string
  experience_required?: string
  salary_range?: string
  description?: string
}) {
  const { data, error } = await supabase.from('job_openings').insert(input).select().single()
  if (error) throw error
  return data as JobOpening
}

export async function deleteJobOpening(id: string) {
  const { error } = await supabase.from('job_openings').delete().eq('id', id)
  if (error) throw error
}

export async function updateJobOpening(id: string, input: Partial<JobOpening>) {
  const { data, error } = await supabase.from('job_openings').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as JobOpening
}

export async function fetchCandidates(jobOpeningId?: string): Promise<Candidate[]> {
  try {
    let query = supabase
      .from('candidates')
      .select('*, job_opening:job_openings(title)')
      .order('applied_at', { ascending: false })
    if (jobOpeningId) query = query.eq('job_opening_id', jobOpeningId)
    let { data, error } = await query

    if (error) {
      const res = await supabase.from('candidates').select('*').order('applied_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (!error && data) {
      return data as Candidate[]
    }
  } catch (err) {
    console.error('fetchCandidates error:', err)
  }

  return []
}

export async function createCandidate(input: {
  name: string
  email: string
  phone?: string
  job_opening_id?: string
  status?: string
  resume_url?: string
  cover_letter?: string
  rating?: number
  source?: string
  reference_id?: string
  temp_id?: string
  ats_score?: number
}) {
  const refId = input.reference_id || input.temp_id || `CAN-${String(Math.floor(Math.random() * 900) + 100)}`
  const atsScore = input.ats_score || Math.floor(Math.random() * 35) + 65

  const baseCandidate = {
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    job_opening_id: input.job_opening_id || null,
    status: input.status || 'applied',
    source: input.source || `HR Entry (ATS: ${atsScore}) | Ref: ${refId}`,
    resume_url: input.resume_url || null,
    cover_letter: input.cover_letter || null,
  }

  const fullCandidate = {
    ...baseCandidate,
    reference_id: refId,
    temp_id: refId,
    ats_score: atsScore,
  }

  let { data, error } = await supabase.from('candidates').insert(fullCandidate).select().single()
  if (error) {
    const fallbackRes = await supabase.from('candidates').insert(baseCandidate).select().single()
    data = fallbackRes.data
    error = fallbackRes.error
  }

  if (error) throw error
  return data as Candidate
}

export async function updateCandidateStatus(id: string, status: string): Promise<Candidate> {
  const payload: Record<string, unknown> = {
    status,
    stage: status,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('candidates').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Candidate
}

export async function updateCandidateStage(id: string, stage: string, rating?: number, notes?: string) {
  const { data, error } = await supabase
    .from('candidates')
    .update({ stage, rating: rating ?? null, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Candidate
}

export async function deleteCandidate(id: string) {
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) throw error
}

export async function fetchInterviews(): Promise<Interview[]> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidate:candidates(name, email, phone), job_opening:job_openings(title), interviewer:employees(first_name, last_name)')
      .order('scheduled_at', { ascending: false })
    if (!error && data !== null) {
      return data as Interview[]
    }
  } catch (err) {
    console.error('fetchInterviews error:', err)
  }
  return []
}

export async function createInterview(input: {
  candidate_id: string
  job_opening_id?: string
  interviewer_id?: string
  round?: string
  scheduled_at: string
  mode?: string
  meeting_link?: string
  exam_link?: string
}) {
  const { data, error } = await supabase.from('interviews').insert(input).select().single()
  if (error) throw error

  // Sync candidate record so Candidate Portal displays the scheduled interview & meeting link immediately
  try {
    const roundLower = (input.round || '').toLowerCase()
    const isScreening = roundLower.includes('screen') || roundLower.includes('exam') || roundLower.includes('round 1')
    const isHrRound = roundLower.includes('hr')

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (isScreening) {
      updatePayload.status = 'Screening'
    } else if (isHrRound) {
      updatePayload.status = 'HR Round'
      updatePayload.hr_interview_status = 'scheduled'
      updatePayload.hr_interview_date = input.scheduled_at
    } else {
      updatePayload.status = 'Interview Scheduled'
      updatePayload.technical_interview_status = 'scheduled'
      updatePayload.technical_interview_date = input.scheduled_at
    }
    if (input.meeting_link) {
      updatePayload.meeting_link = input.meeting_link
    }
    await supabase.from('candidates').update(updatePayload).eq('id', input.candidate_id)

    // Queue email invitation
    const { data: cand } = await supabase.from('candidates').select('name, email, reference_id, date_of_birth').eq('id', input.candidate_id).maybeSingle()
    if (cand?.email) {
      const scheduledFormatted = new Date(input.scheduled_at).toLocaleString()
      await supabase.from('audit_logs').insert({
        action: 'EMAIL_PENDING',
        entity_name: 'interview_invitation',
        details: {
          to: cand.email,
          name: cand.name,
          refId: cand.reference_id,
          round: input.round || 'Technical',
          scheduled_at: scheduledFormatted,
          meeting_link: input.meeting_link || '',
          exam_link: input.exam_link || '',
          from: 'hr@oklut.com',
          subject: `Interview Scheduled: ${input.round || 'Technical'} Round — OKLUT HRMS`,
        },
      })
    }
  } catch (syncErr) {
    console.warn('Candidate interview sync notice:', syncErr)
  }

  return data as Interview
}

export async function updateInterviewStatus(
  id: string,
  status: string,
  feedback?: string,
  rating?: number,
  metrics?: Record<string, number>
) {
  const updateFields: Record<string, unknown> = {
    status,
    feedback: feedback ?? null,
    rating: rating ?? null,
  }
  if (metrics) {
    updateFields.metrics = metrics
  }

  const { data, error } = await supabase
    .from('interviews')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  try {
    if (data?.candidate_id) {
      const roundLower = (data.round || '').toLowerCase()
      const isPassed = status.toLowerCase() === 'passed' || status.toLowerCase() === 'completed'
      const isFailed = status.toLowerCase() === 'failed'
      let candStatus = 'In Review'

      if (roundLower.includes('screen') || roundLower.includes('exam') || roundLower.includes('round 1')) {
        if (isPassed) candStatus = 'Shortlisted'
        else if (isFailed) candStatus = 'Rejected'
      } else if (roundLower.includes('hr')) {
        if (isPassed) candStatus = 'Offer Sent'
        else if (isFailed) candStatus = 'Rejected'
      } else {
        // Technical
        if (isPassed) candStatus = 'HR Round'
        else if (isFailed) candStatus = 'Rejected'
      }

      await supabase.from('candidates').update({
        status: candStatus,
        stage: candStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', data.candidate_id)
    }
  } catch (syncErr) {
    console.warn('Candidate status sync notice:', syncErr)
  }

  return data as Interview
}

export async function fetchOffers(): Promise<Offer[]> {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*, candidate:candidates(name, email, notes), job_opening:job_openings(title)')
      .order('created_at', { ascending: false })
    if (!error && data !== null) {
      return (data as any[]).map((o) => {
        let bondVal = 'No Bond'
        let relocVal = 'Yes'
        let pdfUrl: string | null = null
        let termsText: string | null = null

        if (o.offer_letter_url) {
          try {
            const parsed = JSON.parse(o.offer_letter_url)
            if (parsed.bond) bondVal = parsed.bond
            if (parsed.relocation) relocVal = parsed.relocation
            if (parsed.pdf_url) pdfUrl = parsed.pdf_url
            if (parsed.terms_conditions) termsText = parsed.terms_conditions
          } catch {
            if (o.offer_letter_url.startsWith('http') || o.offer_letter_url.startsWith('data:')) {
              pdfUrl = o.offer_letter_url
            } else if (o.offer_letter_url.includes('Bond:')) {
              const match = o.offer_letter_url.match(/Bond:\s*([^|,\n]+)/)
              if (match) bondVal = match[1].trim()
            }
          }
        } else if (o.candidate?.notes && o.candidate.notes.includes('Bond:')) {
          const match = o.candidate.notes.match(/Bond:\s*([^|,\n]+)/)
          if (match) bondVal = match[1].trim()
        }
        return {
          ...o,
          bond_terms: bondVal,
          bond_agreed: bondVal !== 'No' && bondVal !== 'No Bond',
          relocation_support: relocVal,
          relocation_agreed: relocVal !== 'No',
          pdf_url: pdfUrl,
          terms_conditions: termsText,
        } as Offer
      })
    }
  } catch (err) {
    console.error('fetchOffers error:', err)
  }
  return []
}

export async function createOffer(input: {
  candidate_id: string
  job_opening_id?: string
  salary_offered?: number
  joining_date?: string
  status?: string
  relocation_agreed?: boolean
  bond_agreed?: boolean
  bond?: string
  relocation?: string
  offer_pdf_url?: string
  terms_conditions?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const bondText = input.bond || (input.bond_agreed ? 'Bond Required' : 'No Bond')
  const relocText = input.relocation || (input.relocation_agreed === false ? 'No' : 'Yes')
  const letterMeta = JSON.stringify({
    bond: bondText,
    relocation: relocText,
    pdf_url: input.offer_pdf_url || null,
    terms_conditions: input.terms_conditions || null,
  })

  const payload: Record<string, unknown> = {
    candidate_id: input.candidate_id,
    job_opening_id: input.job_opening_id || null,
    salary_offered: input.salary_offered ?? null,
    joining_date: input.joining_date || null,
    status: input.status || 'issued',
    issued_by: session.session?.user.id ?? null,
    offer_letter_url: letterMeta,
  }

  const { data, error } = await supabase
    .from('offers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  try {
    await supabase.from('candidates').update({
      status: 'offered',
      notes: `[Offer Terms] Bond: ${bondText} | Relocation: ${relocText}`,
      updated_at: new Date().toISOString(),
    }).eq('id', input.candidate_id)
  } catch {}

  return {
    ...data,
    bond_terms: bondText,
    bond_agreed: bondText !== 'No' && bondText !== 'No Bond',
    relocation_support: relocText,
    relocation_agreed: relocText !== 'No',
    offer_letter_url: letterMeta,
    pdf_url: input.offer_pdf_url || null,
    terms_conditions: input.terms_conditions || null,
  } as Offer
}

export async function updateOfferStatus(id: string, status: string) {
  const { data, error } = await supabase.from('offers').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data as Offer
}

// ---------- Audit ----------
export async function fetchAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error && data) return data as AuditLog[]
  } catch (err) {
    console.error('fetchAuditLogs error:', err)
  }
  return []
}

// ---------- Meeting Hall Bookings ----------
export async function fetchMeetingHallBookings(): Promise<MeetingHallBooking[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_hall_bookings')
      .select(`
        *,
        requester:employees(id, first_name, last_name, email, employee_code, department:departments!department_id(name))
      `)
      .order('start_time', { ascending: true })

    if (!error && data) {
      return data as MeetingHallBooking[]
    }

    // Direct table select fallback
    const res = await supabase.from('meeting_hall_bookings').select('*').order('start_time', { ascending: true })
    if (!res.error && res.data) return res.data as MeetingHallBooking[]
  } catch (err) {
    console.error('fetchMeetingHallBookings error:', err)
  }
  return []
}

export async function createMeetingHallBooking(input: {
  title: string
  description?: string
  start_time: string
  end_time: string
  requested_by: string
  status?: string
}): Promise<MeetingHallBooking> {
  let validRequestedBy = input.requested_by

  // Ensure requested_by references a valid employee row
  if (!validRequestedBy || validRequestedBy === '00000000-0000-0000-0000-000000000010') {
    const { data: session } = await supabase.auth.getSession()
    const email = session.session?.user?.email
    if (email) {
      const { data: emp } = await supabase.from('employees').select('id').ilike('email', email).maybeSingle()
      if (emp?.id) validRequestedBy = emp.id
    }
    if (!validRequestedBy || validRequestedBy === '00000000-0000-0000-0000-000000000010') {
      const { data: anyEmp } = await supabase.from('employees').select('id').limit(1).maybeSingle()
      if (anyEmp?.id) validRequestedBy = anyEmp.id
    }
  } else {
    const { data: exists } = await supabase.from('employees').select('id').eq('id', validRequestedBy).maybeSingle()
    if (!exists) {
      const { data: anyEmp } = await supabase.from('employees').select('id').limit(1).maybeSingle()
      if (anyEmp?.id) validRequestedBy = anyEmp.id
    }
  }

  const payload = {
    ...input,
    requested_by: validRequestedBy,
  }

  const { data, error } = await supabase
    .from('meeting_hall_bookings')
    .insert(payload)
    .select(`*, requester:employees(id, first_name, last_name, email, employee_code)`)
    .single()

  if (error) throw error

  // Create notification for Admin
  if (input.status === 'Pending' || !input.status) {
    try {
      const dateStr = new Date(input.start_time).toLocaleDateString()
      const timeStr = `${new Date(input.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(input.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      await supabase.from('notifications').insert({
        type: 'info',
        title: `Meeting Hall Booking Request: ${input.title}`,
        message: `New booking request for "${input.title}" on ${dateStr} (${timeStr}). Please review and approve.`,
        link: '/meeting-hall',
        is_read: false,
      })
    } catch {}
  }

  return data as MeetingHallBooking
}

export async function updateMeetingHallBookingStatus(
  id: string,
  status: 'Approved' | 'Rejected',
  adminComment?: string
): Promise<MeetingHallBooking> {
  const { data, error } = await supabase
    .from('meeting_hall_bookings')
    .update({
      status,
      admin_comment: adminComment ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`*, requester:employees(id, first_name, last_name, email, employee_code)`)
    .single()

  if (error) throw error

  // Notify the requester
  if (data?.requested_by) {
    try {
      await supabase.from('notifications').insert({
        employee_id: data.requested_by,
        type: status === 'Approved' ? 'success' : 'warning',
        title: `Meeting Hall Booking ${status === 'Approved' ? 'Approved ✓' : 'Rejected ✕'}`,
        message: `Your booking request for "${data.title}" has been ${status.toLowerCase()} by the Admin.`,
        link: '/meeting-hall',
        is_read: false,
      })
    } catch {}
  }

  return data as MeetingHallBooking
}

export async function deleteMeetingHallBooking(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_hall_bookings').delete().eq('id', id)
  if (error) throw error
}

