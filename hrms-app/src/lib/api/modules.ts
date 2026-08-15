import { supabase } from '@/lib/supabase'
import type { PerformanceGoal, PerformanceReview, JobOpening, Candidate, Interview, Offer, AuditLog, MeetingHallBooking } from '@/lib/database.types'

// ---------- Performance ----------
export async function fetchPerformanceGoals(employeeId?: string) {
  let query = supabase
    .from('performance_goals')
    .select('*, employee:employees(first_name, last_name, employee_code)')
    .order('created_at', { ascending: false })
  if (employeeId) query = query.eq('employee_id', employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PerformanceGoal[]
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
  let query = supabase
    .from('performance_reviews')
    .select('*, employee:employees(first_name, last_name, employee_code)')
    .order('created_at', { ascending: false })
  if (employeeId) query = query.eq('employee_id', employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PerformanceReview[]
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
  let query = supabase
    .from('job_openings')
    .select('*, department:departments(name)')
    .order('created_at', { ascending: false })
  if (options?.status) query = query.eq('status', options.status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as JobOpening[]
}

export async function createJobOpening(input: {
  title: string
  department_id?: string
  location?: string
  openings_count: number
  description?: string
  requirements?: string
  employment_type?: string
  status?: string
  published?: boolean
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('job_openings')
    .insert({ ...input, created_by: session.session?.user.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as JobOpening
}

export async function updateJobOpening(id: string, patch: Partial<JobOpening>) {
  const { data, error } = await supabase.from('job_openings').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as JobOpening
}

export async function deleteJobOpening(id: string) {
  const { error } = await supabase.from('job_openings').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCandidates() {
  const { data, error } = await supabase
    .from('candidates')
    .select('*, job_opening:job_openings(title, department:departments(name)), converted_employee:employees(first_name, last_name, employee_code)')
    .order('applied_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Candidate[]
}

export async function createCandidate(input: {
  job_opening_id?: string
  name: string
  email: string
  phone?: string
  resume_url?: string
  cover_letter?: string
  source?: string
  ats_score?: number
}) {
  const { ats_score, ...dbInput } = input
  const { data, error } = await supabase.from('candidates').insert(dbInput).select().single()
  if (error) throw error
  return data as Candidate
}

export async function updateCandidateStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('candidates')
    .update({ status, updated_at: new Date().toISOString() })
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

export async function fetchInterviews() {
  const { data, error } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(name, email, phone), job_opening:job_openings(title), interviewer:employees(first_name, last_name)')
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Interview[]
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
  return data as Interview
}

export async function updateInterviewStatus(id: string, status: string, feedback?: string, rating?: number) {
  const { data, error } = await supabase
    .from('interviews')
    .update({ status, feedback: feedback ?? null, rating: rating ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Interview
}

export async function fetchOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*, candidate:candidates(name, email), job_opening:job_openings(title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Offer[]
}

export async function createOffer(input: {
  candidate_id: string
  job_opening_id?: string
  salary_offered?: number
  joining_date?: string
  status?: string
}) {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('offers')
    .insert({ ...input, issued_by: session.session?.user.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Offer
}

export async function updateOfferStatus(id: string, status: string) {
  const { data, error } = await supabase.from('offers').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data as Offer
}

// ---------- Audit ----------
export async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as AuditLog[]
}

// ---------- Meeting Hall Bookings ----------
export async function fetchMeetingHallBookings() {
  const { data, error } = await supabase
    .from('meeting_hall_bookings')
    .select(`
      *,
      requester:employees(id, first_name, last_name, email)
    `)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as MeetingHallBooking[]
}
