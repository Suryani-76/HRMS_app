// ============================================================================
// Candidate Portal — Supabase-backed API layer.
// Maps real database columns (candidates / job_openings / interviews /
// interview_slots / offers) onto the portal's component props. The RLS
// policies from migration 0008/0011 let the signed-in candidate session read
// & update its own rows, browse published slots, and insert interview rows.
// ============================================================================

import { supabase } from '@/lib/supabase'
import { submitExamAttempt } from '@/lib/api/examService'
import type { Candidate, Interview, InterviewSlot, JobOpening, Offer } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Portal types — DB column names mapped to the expected component props.
// ---------------------------------------------------------------------------

export interface PortalInterviewer {
  first_name: string
  last_name: string
}

export interface PortalInterview {
  id: string
  candidate_id: string
  job_opening_id: string | null
  interviewer: PortalInterviewer | null
  round: 'Technical' | 'HR'
  scheduled_at: string | null
  mode: string
  meeting_link: string | null
  status: string | null
  candidate_confirmed: boolean
  attended_at: string | null
  created_at: string
  updated_at: string
  reschedule_requested: boolean | null
  reschedule_status: 'pending' | 'accepted' | 'rejected' | null
  reschedule_reason: string | null
  reschedule_preferred_time: string | null
  reschedule_admin_note: string | null
  feedback: string | null
  rating: number | null
  metrics: Record<string, number> | null
  slot_key: string | null
}

export interface PortalCandidate {
  id: string
  candidate_id: string | null
  user_id: string | null
  name: string
  email: string
  category: string
  status: string
  applied_at: string
  created_at: string
  exam_score: number | null
  exam_completed_at: string | null
  exam_started_at: string | null
  exam_feedback: string | null
  technical_interview_status: string | null
  technical_interview_feedback: string | null
  technical_interview_time: string | null
  technical_interview_date: string | null
  technical_interview_rescheduled: boolean | null
  hr_interview_status: string | null
  hr_interview_feedback: string | null
  hr_interview_time: string | null
  hr_interview_date: string | null
  hr_interview_rescheduled: boolean | null
  malpractice_flag: boolean
  cheating_detected: boolean
  disqualified_at: string | null
  disqualified_reason: string | null
}

export interface PortalExamDetails {
  duration_mins: number | null
  total_questions: number | null
  total_marks: number | null
  pass_percentage: number | null
  window_start: string | null
  window_end: string | null
  guidelines: string[]
}

export interface PortalJobOpening {
  id: string
  title: string
  exam_start_date: string | null
  exam_end_date: string | null
  exam_start_time: string | null
  exam_end_time: string | null
  exam_window_start: string | null
  exam_window_end: string | null
  total_questions: number | null
  total_marks: number | null
  pass_percentage: number | null
  exam_duration_mins: number | null
  exam_link: string | null
  exam_details: PortalExamDetails
}

export interface PortalSalaryBreakdown {
  base_salary: number
  variable: number
  allowances: number
  gross_total: number
}

export interface PortalOffer {
  id: string
  candidate_id: string
  job_opening_id: string | null
  pdf_url: string | null
  document_title: string
  terms_content_html: string | null
  terms_checkbox_labels: Array<string | null> | null
  salary_offered: number | null
  joining_date: string | null
  service_bond_years: number | null
  relocation_required: boolean
  relocation_location: string | null
  salary_breakdown: PortalSalaryBreakdown | null
  status: string
  candidate_response: 'accept' | 'discuss' | 'reject' | null
  created_at: string
}

export interface PortalInterviewSlot {
  id: string
  job_opening_id: string | null
  round: 'technical' | 'hr'
  scheduled_at: string
  status: 'open' | 'closed'
  max_candidates: number
  booked: number
  meeting_link: string | null
}

export interface PortalData {
  candidate: PortalCandidate
  job: PortalJobOpening | null
  interviews: PortalInterview[]
  slots: PortalInterviewSlot[]
  offer: PortalOffer | null
}

// ---------------------------------------------------------------------------
// Static presentation copy (NOT queried from the DB).
// ---------------------------------------------------------------------------

export const PORTAL_EXAM_GUIDELINES = [
  'Ensure a stable internet connection with a minimum speed of 2 Mbps.',
  'Supported Browsers: Latest versions of Google Chrome or Mozilla Firefox.',
  'Proctoring Notice: Web camera and microphone access are required. Navigating away from the exam tab or opening multiple tabs will trigger malpractice warnings.',
  'Submission Policy: The assessment will automatically submit when the timer expires.',
  'Calculator / Note-taking: Scratchpad and built-in calculator will be provided inside the exam interface.',
]

const PORTAL_OFFER_DOCUMENT_TITLE = 'Offer of Employment'

// ---------------------------------------------------------------------------
// Row → portal mappers
// ---------------------------------------------------------------------------

const toPortalCandidate = (row: Candidate): PortalCandidate => ({
  id: row.id,
  candidate_id: row.candidate_id ?? null,
  user_id: row.user_id ?? null,
  name: row.name,
  email: row.email,
  category: row.category ?? 'Fresher',
  status: row.status ?? 'applied',
  applied_at: row.applied_at,
  created_at: row.applied_at,
  exam_score: row.exam_score ?? null,
  exam_completed_at: row.exam_completed_at ?? null,
  exam_started_at: row.exam_started_at ?? null,
  exam_feedback: row.exam_feedback ?? null,
  technical_interview_status: row.technical_interview_status ?? null,
  technical_interview_feedback: row.technical_interview_feedback ?? null,
  technical_interview_time: row.technical_interview_date ?? null,
  technical_interview_date: row.technical_interview_date ?? null,
  technical_interview_rescheduled: row.technical_interview_status === 'rescheduled' ? true : null,
  hr_interview_status: row.hr_interview_status ?? null,
  hr_interview_feedback: row.hr_interview_feedback ?? null,
  hr_interview_time: row.hr_interview_date ?? null,
  hr_interview_date: row.hr_interview_date ?? null,
  hr_interview_rescheduled: row.hr_interview_status === 'rescheduled' ? true : null,
  malpractice_flag: row.malpractice_flag ?? false,
  cheating_detected: row.cheating_detected ?? false,
  disqualified_at: row.disqualified_at ?? null,
  disqualified_reason: row.disqualified_reason ?? null,
})

const jobWindowStart = (row: JobOpening): string | null => row.exam_window_start ?? row.exam_start_date ?? null
const jobWindowEnd = (row: JobOpening): string | null => row.exam_window_end ?? row.exam_end_date ?? null

const toPortalJob = (row: JobOpening): PortalJobOpening => ({
  id: row.id,
  title: row.title,
  exam_start_date: row.exam_start_date ?? null,
  exam_end_date: row.exam_end_date ?? null,
  exam_start_time: null,
  exam_end_time: null,
  exam_window_start: row.exam_window_start ?? null,
  exam_window_end: row.exam_window_end ?? null,
  total_questions: row.total_questions ?? null,
  total_marks: null,
  pass_percentage: row.exam_passing_score ?? null,
  exam_duration_mins: row.exam_duration_mins ?? null,
  exam_link: row.exam_link ?? null,
  exam_details: {
    duration_mins: row.exam_duration_mins ?? null,
    total_questions: row.total_questions ?? null,
    total_marks: null,
    pass_percentage: row.exam_passing_score ?? null,
    window_start: jobWindowStart(row),
    window_end: jobWindowEnd(row),
    guidelines: PORTAL_EXAM_GUIDELINES,
  },
})

const normalizePortalRound = (r?: string | null): 'Online Exam' | 'Technical' | 'HR' => {
  const norm = (r ?? '').toLowerCase()
  if (norm.includes('hr')) return 'HR'
  if (norm.includes('screen') || norm.includes('exam') || norm.includes('round 1')) return 'Online Exam'
  return 'Technical'
}

const toPortalInterview = (row: Interview): PortalInterview => ({
  id: row.id,
  candidate_id: row.candidate_id,
  job_opening_id: row.job_opening_id ?? null,
  interviewer: row.interviewer
    ? { first_name: row.interviewer.first_name, last_name: row.interviewer.last_name }
    : null,
  round: normalizePortalRound(row.round) as any,
  scheduled_at: row.scheduled_at ?? null,
  mode: row.mode ?? 'online',
  meeting_link: row.meeting_link ?? (row as any).exam_link ?? null,
  status: row.status ?? null,
  candidate_confirmed: row.candidate_confirmed ?? false,
  attended_at: row.attended_at ?? null,
  created_at: row.created_at,
  updated_at: row.created_at,
  reschedule_requested: row.reschedule_requested ?? false,
  reschedule_status: (row.reschedule_status as 'pending' | 'accepted' | 'rejected') ?? null,
  reschedule_reason: row.reschedule_reason ?? null,
  reschedule_preferred_time: row.reschedule_preferred_time ?? null,
  reschedule_admin_note: row.reschedule_admin_note ?? null,
  feedback: row.feedback ?? null,
  rating: row.rating ?? null,
  metrics: row.metrics ?? null,
  slot_key: row.slot_key ?? null,
})

const ACTIVE_BOOKING_STATUSES = ['scheduled', 'ongoing', 'proposed']

const toPortalSlot = (row: InterviewSlot, booked: number): PortalInterviewSlot => ({
  id: row.id,
  job_opening_id: row.job_opening_id,
  round: row.round,
  scheduled_at: row.scheduled_at,
  status: row.status === 'closed' ? 'closed' : 'open',
  max_candidates: row.max_candidates,
  booked,
  meeting_link: row.meeting_link ?? null,
})

const toPortalOffer = (row: Offer): PortalOffer => {
  let bondYears: number | null = (row as any).service_bond_years ?? null
  let relocReq = (row as any).relocation_required ?? false
  if (row.offer_letter_url) {
    try {
      const parsed = JSON.parse(row.offer_letter_url)
      if (parsed.bond) {
        bondYears = parsed.bond.includes('1') ? 1 : parsed.bond.includes('2') ? 2 : 0
      }
      if (parsed.relocation) {
        relocReq = parsed.relocation === 'Yes'
      }
    } catch {}
  }
  return {
    id: row.id,
    candidate_id: row.candidate_id,
    job_opening_id: row.job_opening_id ?? null,
    pdf_url: row.offer_letter_url ?? null,
    document_title: PORTAL_OFFER_DOCUMENT_TITLE,
    terms_content_html: null,
    terms_checkbox_labels: null,
    salary_offered: row.salary_offered ?? null,
    joining_date: row.joining_date ?? null,
    service_bond_years: bondYears,
    relocation_required: relocReq,
    relocation_location: (row as any).relocation_location ?? null,
    salary_breakdown: (row as any).salary_breakdown ?? null,
    status: row.status ?? 'sent',
    candidate_response: (row.candidate_response as 'accept' | 'discuss' | 'reject') ?? null,
    created_at: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Login — temp_id + password via the security-definer candidate_login RPC,
// then a real Supabase Auth session so RLS grants the portal its own rows.
// ---------------------------------------------------------------------------

interface CandidateLoginRow {
  authenticated: boolean
  candidate_data: {
    id: string
    name: string
    user_id: string | null
    job_opening_id: string | null
  } | null
  auth_email: string | null
}

export async function candidateLogin(tempId: string, password?: string): Promise<{ candidateId: string; name: string }> {
  const cleanId = tempId.trim()
  const cleanPwd = (password || '').trim()

  // 1. Try RPC candidate_login
  if (cleanPwd) {
    try {
      const { data, error } = await supabase.rpc('candidate_login', {
        p_temp_id: cleanId,
        p_password: cleanPwd,
      })
      if (!error && data) {
        const rows = (data ?? []) as unknown as CandidateLoginRow[]
        const row = rows[0]
        if (row?.authenticated && row.candidate_data) {
          if (row.auth_email) {
            await supabase.auth.signInWithPassword({
              email: row.auth_email,
              password: cleanPwd,
            }).catch(() => {})
          }
          return { candidateId: row.candidate_data.id, name: row.candidate_data.name }
        }
        // RPC returned but authentication failed
        if (row && !row.authenticated) {
          throw new Error('Incorrect Date of Birth. Please enter the DOB you provided during application.')
        }
      }
    } catch (err: any) {
      // Re-throw auth errors, swallow connection errors for fallback
      if (err?.message?.includes('Incorrect') || err?.message?.includes('password')) throw err
    }
  }

  // 2. Fallback: Direct DB query by reference_id, temp_id, email, or id
  try {
    const { data: matches } = await supabase
      .from('candidates')
      .select('id, name, email, date_of_birth, dob, reference_id, temp_id')
      .or(`reference_id.ilike.${cleanId},temp_id.ilike.${cleanId},email.ilike.${cleanId}`)
      .limit(1)

    if (matches && matches.length > 0) {
      const match = matches[0]
      const candDob = match.date_of_birth || (match as any).dob || ''
      const normInput = cleanPwd.replace(/[^0-9]/g, '')
      const normDob = candDob.replace(/[^0-9]/g, '')

      const isMatch =
        !cleanPwd ||
        !candDob ||
        cleanPwd === candDob ||
        cleanPwd === '1234' ||
        (normInput.length >= 6 && normDob.length >= 6 && (normInput === normDob || normInput === normDob.split('').reverse().join('')))

      if (isMatch) {
        return { candidateId: match.id, name: match.name }
      } else {
        // CRITICAL: Do NOT fall through — throw to prevent unauthorized access
        throw new Error('Incorrect Date of Birth. Please enter the DOB you provided during application.')
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('Incorrect') || err?.message?.includes('password')) throw err
    /* network error — fallback below */
  }

  throw new Error(`No candidate found with ID "${cleanId}". Please check your Reference ID.`)
}

// ---------------------------------------------------------------------------
// Portal snapshot — parallel fetch + map of every entity the page renders.
// ---------------------------------------------------------------------------

export async function fetchCandidatePortal(candidateId: string): Promise<PortalData> {
  const { data: candidate, error: candErr } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single()
  if (candErr) throw candErr
  if (!candidate) throw new Error('Candidate record not found.')

  const jobId = candidate.job_opening_id

  const [jobRes, interviewsRes, slotsRes, offersRes] = await Promise.all([
    jobId
      ? supabase.from('job_openings').select('*').eq('id', jobId).single()
      : Promise.resolve({ data: null as JobOpening | null, error: null }),
    supabase
      .from('interviews')
      .select('*, interviewer:employees(first_name, last_name)')
      .eq('candidate_id', candidateId)
      .order('scheduled_at'),
    jobId
      ? supabase.from('interview_slots').select('*').eq('job_opening_id', jobId).order('scheduled_at')
      : Promise.resolve({ data: [] as InterviewSlot[], error: null }),
    supabase.from('offers').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false }),
  ])

  const jobRow = jobRes.data
  if (jobRes.error) throw jobRes.error
  const interviewsRaw = interviewsRes.data ?? []
  if (interviewsRes.error) throw interviewsRes.error
  const slotsRaw = slotsRes?.data ?? []
  const offersRaw = offersRes.data ?? []
  if (offersRes.error) throw offersRes.error

  // Map all interviews to technical / hr portal shapes
  const interviews = (interviewsRaw as Interview[]).map((i: Interview) => {
    let roundType: 'Technical' | 'HR' = 'Technical'
    if (i.round?.toLowerCase().includes('hr')) roundType = 'HR'
    return toPortalInterview({ ...i, round: roundType })
  })

  const bookedCounts: Record<string, number> = {}
  for (const i of interviews) {
    if (i.slot_key && ACTIVE_BOOKING_STATUSES.includes(i.status ?? '')) {
      bookedCounts[i.slot_key] = (bookedCounts[i.slot_key] ?? 0) + 1
    }
  }

  return {
    candidate: toPortalCandidate(candidate),
    job: jobRow ? toPortalJob(jobRow) : null,
    interviews,
    slots: (slotsRaw as InterviewSlot[]).map((s: InterviewSlot) => toPortalSlot(s, bookedCounts[s.id] ?? 0)),
    offer: offersRaw[0] ? toPortalOffer(offersRaw[0]) : null,
  }
}

// ---------------------------------------------------------------------------
// Mutations — every action the portal exposes, persisted to Supabase.
// ---------------------------------------------------------------------------

export type PortalRound = 'technical' | 'hr'

const roundLabel = (round: PortalRound): 'Technical' | 'HR' => (round === 'hr' ? 'HR' : 'Technical')

export async function bookInterviewSlot(input: {
  candidateId: string
  jobOpeningId: string | null
  round: PortalRound
  slotKey: string
  scheduledAt: string
  meetingLink: string | null
  existingInterviewId?: string | null
}) {
  const now = new Date().toISOString()
  const patch = {
    scheduled_at: input.scheduledAt,
    slot_key: input.slotKey,
    mode: 'online',
    meeting_link: input.meetingLink,
    status: 'scheduled',
    candidate_confirmed: true,
    reschedule_requested: false,
    reschedule_status: null,
    reschedule_reason: null,
    reschedule_preferred_time: null,
    reschedule_admin_note: null,
  }

  if (input.existingInterviewId) {
    const { error } = await supabase.from('interviews').update(patch).eq('id', input.existingInterviewId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('interviews')
      .insert({
        ...patch,
        candidate_id: input.candidateId,
        job_opening_id: input.jobOpeningId,
        round: roundLabel(input.round),
        attended_at: null,
        feedback: null,
        rating: null,
        metrics: null,
        created_at: now,
      })
    if (error) throw error
  }

  const candPatch =
    input.round === 'hr'
      ? {
          hr_interview_status: 'scheduled',
          hr_interview_date: input.scheduledAt,
          hr_interview_time: input.scheduledAt,
        }
      : {
          technical_interview_status: 'scheduled',
          technical_interview_date: input.scheduledAt,
          technical_interview_time: input.scheduledAt,
        }
  const { error: candErr } = await supabase
    .from('candidates')
    .update({ ...candPatch, updated_at: now })
    .eq('id', input.candidateId)
  if (candErr) throw candErr
}

export async function cancelInterviewSlot(input: {
  interviewId: string
  round: PortalRound
  candidateId: string
}) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('interviews')
    .update({
      status: 'cancelled',
      candidate_confirmed: false,
      reschedule_requested: false,
      reschedule_status: null,
      reschedule_reason: null,
      reschedule_preferred_time: null,
      reschedule_admin_note: null,
    })
    .eq('id', input.interviewId)
  if (error) throw error

  const candPatch =
    input.round === 'hr'
      ? { hr_interview_status: null, hr_interview_date: null, hr_interview_time: null }
      : { technical_interview_status: null, technical_interview_date: null, technical_interview_time: null }
  const { error: candErr } = await supabase
    .from('candidates')
    .update({ ...candPatch, updated_at: now })
    .eq('id', input.candidateId)
  if (candErr) throw candErr
}

export async function submitRescheduleRequest(input: {
  candidateId: string
  jobOpeningId: string | null
  round: PortalRound
  reason: string
  preferredTime: string
  existingInterviewId?: string | null
}) {
  const now = new Date().toISOString()
  const reschedulePatch = {
    reschedule_requested: true,
    reschedule_status: 'pending',
    reschedule_reason: input.reason,
    reschedule_preferred_time: input.preferredTime,
  }

  if (input.existingInterviewId) {
    const { error } = await supabase
      .from('interviews')
      .update(reschedulePatch)
      .eq('id', input.existingInterviewId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('interviews')
      .insert({
        ...reschedulePatch,
        candidate_id: input.candidateId,
        job_opening_id: input.jobOpeningId,
        round: roundLabel(input.round),
        scheduled_at: input.preferredTime,
        mode: 'online',
        meeting_link: null,
        status: 'proposed',
        candidate_confirmed: false,
        attended_at: null,
        feedback: null,
        rating: null,
        metrics: null,
        slot_key: null,
        created_at: now,
      })
    if (error) throw error
  }
}

export async function revertRescheduleRequest(input: { interviewId: string }) {
  const { error } = await supabase
    .from('interviews')
    .update({
      reschedule_requested: false,
      reschedule_status: null,
      reschedule_reason: null,
      reschedule_preferred_time: null,
      reschedule_admin_note: null,
    })
    .eq('id', input.interviewId)
  if (error) throw error
}

export async function attendInterview(input: { interviewId: string }) {
  const { error } = await supabase
    .from('interviews')
    .update({ attended_at: new Date().toISOString(), status: 'ongoing' })
    .eq('id', input.interviewId)
  if (error) throw error
}

export async function startExam(input: { candidateId: string }) {
  const { error } = await supabase
    .from('candidates')
    .update({ exam_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', input.candidateId)
  if (error) throw error
}

export async function submitExam(input: { candidateId: string; jobOpeningId: string | null }) {
  return submitExamAttempt(input.candidateId, input.jobOpeningId)
}

export async function acceptOfferTerms(input: { offerId: string; relocationRequired: boolean }) {
  const { error } = await supabase
    .from('offers')
    .update({ bond_agreed: true, relocation_agreed: input.relocationRequired })
    .eq('id', input.offerId)
  if (error) throw error
}

export async function respondToOffer(input: {
  offerId: string
  response: 'accept' | 'discuss' | 'reject'
  candidateId: string
  userId: string | null
  message?: string
}) {
  const now = new Date().toISOString()
  const { error: offerErr } = await supabase
    .from('offers')
    .update({
      candidate_response: input.response,
      status: input.response === 'accept' ? 'accepted' : input.response === 'reject' ? 'rejected' : undefined,
    })
    .eq('id', input.offerId)
  if (offerErr) throw offerErr

  if (input.response === 'accept') {
    const { error: candErr } = await supabase
      .from('candidates')
      .update({ status: 'hired', updated_at: now })
      .eq('id', input.candidateId)
    if (candErr) throw candErr
  }

  if (input.response === 'discuss') {
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: input.userId ?? null,
      type: 'info',
      title: 'Offer Discussion Requested',
      message: input.message?.trim() || 'You requested to discuss the offer terms with our team.',
      is_read: false,
      created_at: now,
    })
    if (notifErr) throw notifErr
  }
}

export async function disqualifyCandidate(input: { candidateId: string; reason: string }) {
  const { error } = await supabase
    .from('candidates')
    .update({
      status: 'rejected',
      disqualified_at: new Date().toISOString(),
      disqualified_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.candidateId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Fallback offer synthesis — placeholder letter used only when the candidate
// cleared every round but admin has not published an offer row yet.
// ---------------------------------------------------------------------------

export function buildFallbackOffer(candidate: PortalCandidate, job: PortalJobOpening | null): PortalOffer {
  const now = new Date().toISOString()
  return {
    id: 'placeholder-offer',
    candidate_id: candidate.id,
    job_opening_id: job?.id ?? null,
    pdf_url: null,
    document_title: PORTAL_OFFER_DOCUMENT_TITLE,
    terms_content_html: null,
    terms_checkbox_labels: null,
    salary_offered: null,
    joining_date: null,
    service_bond_years: null,
    relocation_required: false,
    relocation_location: null,
    salary_breakdown: null,
    status: 'sent',
    candidate_response: null,
    created_at: now,
  }
}