import { supabase } from '@/lib/supabase'
import type { PerformanceGoal, PerformanceReview, JobOpening, Candidate, Interview, Offer, AuditLog, MeetingHallBooking, Employee } from '@/lib/database.types'
import { INITIAL_MEETINGS, INITIAL_JOB_OPENINGS, INITIAL_CANDIDATES, INITIAL_INTERVIEWS, INITIAL_OFFERS, INITIAL_EMPLOYEES } from '@/lib/seed-data'

// ---------- Local Storage Keys ----------
const JOBS_KEY = 'hrms_local_job_openings'
const CANDIDATES_KEY = 'hrms_local_candidates'
const INTERVIEWS_KEY = 'hrms_local_interviews'
const OFFERS_KEY = 'hrms_local_offers'
const MEETINGS_KEY = 'hrms_local_meeting_bookings'

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
  } catch {}
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
  } catch {}
  return []
}

export async function createReview(input: {
  employee_id: string
  period: string
  goals?: string
  rating?: number
  comments?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('performance_reviews')
    .insert({ ...input, reviewer_id: session.session?.user.id ?? null, status: 'submitted', review_date: new Date().toISOString().slice(0, 10) })
    .select()
    .single()
  if (error) throw error
  return data as PerformanceReview
}

// ---------- Recruitment ----------
export async function fetchJobOpenings(options?: { status?: string }) {
  void options;
  try {
    const { data, error } = await supabase
      .from('job_openings')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      setLocal(JOBS_KEY, data)
      return data as JobOpening[]
    }
  } catch {}
  return getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS)
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
  let created: JobOpening | null = null
  try {
    const { data, error } = await supabase.from('job_openings').insert(input).select().single()
    if (!error && data) created = data as JobOpening
  } catch {}

  if (!created) {
    created = {
      ...input,
      id: 'job-' + Date.now(),
      published: true,
      status: 'Open',
      created_at: new Date().toISOString(),
    } as unknown as JobOpening
  }
  const current = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS)
  setLocal(JOBS_KEY, [created, ...current])
  return created
}

export async function deleteJobOpening(id: string) {
  try {
    await supabase.from('job_openings').delete().eq('id', id)
  } catch {}
  const current = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS).filter((j) => j.id !== id)
  setLocal(JOBS_KEY, current)
}

export async function updateJobOpening(id: string, input: Partial<JobOpening>) {
  try {
    const { data, error } = await supabase.from('job_openings').update(input).eq('id', id).select().single()
    if (!error && data) {
      const current = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS).map((j) => (j.id === id ? { ...j, ...data } : j))
      setLocal(JOBS_KEY, current)
      return data as JobOpening
    }
  } catch {}
  const current = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS).map((j) => (j.id === id ? { ...j, ...input } : j))
  setLocal(JOBS_KEY, current)
  return current.find((j) => j.id === id)!
}

export async function fetchCandidates(jobOpeningId?: string): Promise<Candidate[]> {
  try {
    let query = supabase
      .from('candidates')
      .select('*, job_opening:job_openings(title)')
      .order('created_at', { ascending: false })
    if (jobOpeningId) query = query.eq('job_opening_id', jobOpeningId)
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      setLocal(CANDIDATES_KEY, data)
      return data as Candidate[]
    }
  } catch {}

  let candidates = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES)
  if (jobOpeningId) {
    candidates = candidates.filter((c) => c.job_opening_id === jobOpeningId)
  }
  return candidates
}

export async function createCandidate(input: {
  job_opening_id?: string
  name: string
  email: string
  phone?: string
  status?: string
  stage?: string
  resume_url?: string
  rating?: number
  source?: string
  reference_id?: string
  temp_id?: string
  ats_score?: number
}) {
  let created: Candidate | null = null
  try {
    const { data, error } = await supabase
      .from('candidates')
      .insert(input)
      .select()
      .single()
    if (!error && data) created = data as Candidate
  } catch {}

  if (!created) {
    const refId = input.reference_id || input.temp_id || `CAN-${String(Math.floor(Math.random() * 900) + 100)}`
    const atsScore = input.ats_score || Math.floor(Math.random() * 35) + 65
    created = {
      id: 'can-' + Date.now(),
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      job_opening_id: input.job_opening_id || null,
      status: input.status || 'Applied',
      source: input.source || `HR Entry (ATS: ${atsScore})`,
      resume_url: input.resume_url || null,
      reference_id: refId,
      temp_id: refId,
      ats_score: atsScore,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Candidate
  }

  const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES)
  setLocal(CANDIDATES_KEY, [created, ...current.filter((c) => c.id !== created!.id)])
  return created
}

export async function updateCandidateStatus(id: string, status: string): Promise<Candidate> {
  try {
    const { data, error } = await supabase.from('candidates').update({ status }).eq('id', id).select().single()
    if (!error && data) {
      const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES).map((c) => (c.id === id ? { ...c, ...data } : c))
      setLocal(CANDIDATES_KEY, current)
      return data as Candidate
    }
  } catch {}

  const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES).map((c) => (c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c))
  setLocal(CANDIDATES_KEY, current)
  return current.find((c) => c.id === id) || ({ id, status } as unknown as Candidate)
}

export async function updateCandidateStage(id: string, stage: string, rating?: number, notes?: string) {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .update({ stage, rating: rating ?? null, notes: notes ?? null })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES).map((c) => (c.id === id ? { ...c, ...data } : c))
      setLocal(CANDIDATES_KEY, current)
      return data as Candidate
    }
  } catch {}

  const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES).map((c) => (c.id === id ? { ...c, status: stage, stage, rating } : c))
  setLocal(CANDIDATES_KEY, current)
  return current.find((c) => c.id === id)!
}

export async function deleteCandidate(id: string) {
  try {
    await supabase.from('candidates').delete().eq('id', id)
  } catch {}
  const current = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES).filter((c) => c.id !== id)
  setLocal(CANDIDATES_KEY, current)
}

export async function fetchInterviews(): Promise<Interview[]> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidate:candidates(name, email, phone), job_opening:job_openings(title), interviewer:employees(first_name, last_name)')
      .order('scheduled_at', { ascending: false })
    if (!error && data && data.length > 0) {
      setLocal(INTERVIEWS_KEY, data)
      return data as Interview[]
    }
  } catch {}
  return getLocal<Interview>(INTERVIEWS_KEY, INITIAL_INTERVIEWS)
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
  let created: Interview | null = null
  try {
    const { data, error } = await supabase.from('interviews').insert(input).select().single()
    if (!error && data) created = data as Interview
  } catch {}

  if (!created) {
    const candidates = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES)
    const jobs = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS)
    const candidate = candidates.find((c) => c.id === input.candidate_id)
    const job = jobs.find((j) => j.id === input.job_opening_id)
    created = {
      ...input,
      id: 'int-' + Date.now(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
      candidate,
      job_opening: job,
    } as unknown as Interview
  }

  const current = getLocal<Interview>(INTERVIEWS_KEY, INITIAL_INTERVIEWS)
  setLocal(INTERVIEWS_KEY, [created, ...current])
  return created
}

export async function updateInterviewStatus(id: string, status: string, feedback?: string, rating?: number) {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .update({ status, feedback: feedback ?? null, rating: rating ?? null })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      const current = getLocal<Interview>(INTERVIEWS_KEY, INITIAL_INTERVIEWS).map((i) => (i.id === id ? { ...i, ...data } : i))
      setLocal(INTERVIEWS_KEY, current)
      return data as Interview
    }
  } catch {}

  const current = getLocal<Interview>(INTERVIEWS_KEY, INITIAL_INTERVIEWS).map((i) => (i.id === id ? { ...i, status, feedback, rating } : i))
  setLocal(INTERVIEWS_KEY, current)
  return current.find((i) => i.id === id)!
}

export async function fetchOffers(): Promise<Offer[]> {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*, candidate:candidates(name, email), job_opening:job_openings(title)')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      setLocal(OFFERS_KEY, data)
      return data as Offer[]
    }
  } catch {}
  return getLocal<Offer>(OFFERS_KEY, INITIAL_OFFERS)
}

export async function createOffer(input: {
  candidate_id: string
  job_opening_id?: string
  salary_offered?: number
  joining_date?: string
  status?: string
}) {
  let created: Offer | null = null
  try {
    const { data: session } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('offers')
      .insert({ ...input, issued_by: session.session?.user.id ?? null })
      .select()
      .single()
    if (!error && data) created = data as Offer
  } catch {}

  if (!created) {
    const candidates = getLocal<Candidate>(CANDIDATES_KEY, INITIAL_CANDIDATES)
    const jobs = getLocal<JobOpening>(JOBS_KEY, INITIAL_JOB_OPENINGS)
    const candidate = candidates.find((c) => c.id === input.candidate_id)
    const job = jobs.find((j) => j.id === input.job_opening_id)
    created = {
      ...input,
      id: 'off-' + Date.now(),
      status: input.status || 'issued',
      created_at: new Date().toISOString(),
      candidate,
      job_opening: job,
    } as unknown as Offer
  }

  const current = getLocal<Offer>(OFFERS_KEY, INITIAL_OFFERS)
  setLocal(OFFERS_KEY, [created, ...current])
  return created
}

export async function updateOfferStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase.from('offers').update({ status }).eq('id', id).select().single()
    if (!error && data) {
      const current = getLocal<Offer>(OFFERS_KEY, INITIAL_OFFERS).map((o) => (o.id === id ? { ...o, ...data } : o))
      setLocal(OFFERS_KEY, current)
      return data as Offer
    }
  } catch {}

  const current = getLocal<Offer>(OFFERS_KEY, INITIAL_OFFERS).map((o) => (o.id === id ? { ...o, status } : o))
  setLocal(OFFERS_KEY, current)
  return current.find((o) => o.id === id)!
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
  } catch {}
  return []
}

// ---------- Meeting Hall Bookings ----------
export async function fetchMeetingHallBookings(): Promise<MeetingHallBooking[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_hall_bookings')
      .select(`
        *,
        requester:employees(id, first_name, last_name, email, employee_code, department:departments(name))
      `)
      .order('start_time', { ascending: true })

    if (!error && data && data.length > 0) {
      setLocal(MEETINGS_KEY, data)
      return data as MeetingHallBooking[]
    }
  } catch (err) {
    console.warn('fetchMeetingHallBookings fallback to seed data:', err)
  }
  return getLocal<MeetingHallBooking>(MEETINGS_KEY, INITIAL_MEETINGS)
}

export async function createMeetingHallBooking(input: {
  title: string
  description?: string
  start_time: string
  end_time: string
  requested_by: string
  status?: string
}): Promise<MeetingHallBooking> {
  let created: MeetingHallBooking | null = null
  try {
    const { data, error } = await supabase
      .from('meeting_hall_bookings')
      .insert(input)
      .select(`*, requester:employees(id, first_name, last_name, email, employee_code)`)
      .single()
    if (!error && data) created = data as MeetingHallBooking
  } catch (err) {
    console.warn('createMeetingHallBooking insert error:', err)
  }

  const employees = getLocal<Employee>('hrms_local_employees', INITIAL_EMPLOYEES)
  const requester = employees.find((e) => e.id === input.requested_by)

  if (!created) {
    created = {
      ...input,
      id: 'meet-' + Date.now(),
      status: input.status || 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requester: requester ?? null,
    } as unknown as MeetingHallBooking
  }

  const current = getLocal<MeetingHallBooking>(MEETINGS_KEY, INITIAL_MEETINGS)
  setLocal(MEETINGS_KEY, [created, ...current])

  // If status is Pending, create notification for Admin / CEO
  if (created.status === 'Pending') {
    try {
      const dateStr = new Date(input.start_time).toLocaleDateString()
      const timeStr = `${new Date(input.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(input.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      await supabase.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        type: 'info',
        title: `Meeting Hall Booking Request: ${input.title}`,
        message: `${requester?.first_name || 'An employee'} requested the Meeting Hall for "${input.title}" on ${dateStr} (${timeStr}). Please review and approve.`,
        link: '/meeting-hall',
        is_read: false,
      })
    } catch {}
  }

  return created
}

export async function updateMeetingHallBookingStatus(
  id: string,
  status: 'Approved' | 'Rejected',
  adminComment?: string
): Promise<MeetingHallBooking> {
  let updated: MeetingHallBooking | null = null
  try {
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
    if (!error && data) updated = data as MeetingHallBooking
  } catch (err) {
    console.warn('updateMeetingHallBookingStatus update error:', err)
  }

  const current = getLocal<MeetingHallBooking>(MEETINGS_KEY, INITIAL_MEETINGS)
  const item = current.find((b) => b.id === id)
  if (!updated && item) {
    updated = {
      ...item,
      status,
      admin_comment: adminComment ?? null,
      updated_at: new Date().toISOString(),
    }
  }

  if (updated) {
    const nextList = current.map((b) => (b.id === id ? updated! : b))
    setLocal(MEETINGS_KEY, nextList)

    // Notify the requester
    try {
      if (updated.requested_by) {
        await supabase.from('notifications').insert({
          employee_id: updated.requested_by,
          type: status === 'Approved' ? 'success' : 'warning',
          title: `Meeting Hall Booking ${status === 'Approved' ? 'Approved ✓' : 'Rejected ✕'}`,
          message: `Your booking request for "${updated.title}" has been ${status.toLowerCase()} by the Admin.`,
          link: '/meeting-hall',
          is_read: false,
        })
      }
    } catch {}

    return updated
  }

  return { id, status } as unknown as MeetingHallBooking
}

export async function deleteMeetingHallBooking(id: string): Promise<void> {
  try {
    await supabase.from('meeting_hall_bookings').delete().eq('id', id)
  } catch {}
  const current = getLocal<MeetingHallBooking>(MEETINGS_KEY, INITIAL_MEETINGS).filter((b) => b.id !== id)
  setLocal(MEETINGS_KEY, current)
}

