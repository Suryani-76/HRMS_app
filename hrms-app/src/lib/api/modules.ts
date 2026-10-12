import { supabase } from '@/lib/supabase'
import type { PerformanceGoal, PerformanceReview, JobOpening, Candidate, Interview, Offer, AuditLog, MeetingHallBooking } from '@/lib/database.types'
import {
  sendCandidateStatusAlertEmail,
  sendInterviewScheduledAlertEmail,
  sendInterviewRescheduledAlertEmail,
  sendRoundClearedAlertEmail,
  sendOfferLetterReleasedAlertEmail,
} from '@/lib/api/email'

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

export async function uploadGoalDocument(
  employeeId: string,
  file: File
): Promise<{ url: string; name: string; size: number }> {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `goals/${employeeId}/${Date.now()}-${safeName}`
    const { data, error } = await supabase.storage.from('documents').upload(path, file)
    if (!error && data) {
      const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(path)
      return { url: pubUrl.publicUrl, name: file.name, size: file.size }
    }
  } catch (err) {
    console.warn('Storage bucket upload error, falling back to base64 Data URL:', err)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({ url: reader.result as string, name: file.name, size: file.size })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function createGoal(input: {
  employee_id: string
  title: string
  description?: string
  target?: string
  due_date?: string
  document_url?: string
  document_name?: string
}) {
  const { data: session } = await supabase.auth.getSession()

  let formattedDesc = input.description || ''
  if (input.document_url) {
    const docMeta = JSON.stringify({ url: input.document_url, name: input.document_name || 'Goal Document' })
    formattedDesc = `${formattedDesc} [DOC:${docMeta}]`.trim()
  }

  const payload: any = {
    employee_id: input.employee_id,
    title: input.title,
    description: formattedDesc || null,
    target: input.target || null,
    due_date: input.due_date || null,
    reviewer_id: session.session?.user.id ?? null,
    document_url: input.document_url || null,
    document_name: input.document_name || null,
  }

  let { data, error } = await supabase
    .from('performance_goals')
    .insert(payload)
    .select()
    .single()

  if (error) {
    delete payload.document_url
    delete payload.document_name
    const retryRes = await supabase
      .from('performance_goals')
      .insert(payload)
      .select()
      .single()
    if (retryRes.error) throw retryRes.error
    data = retryRes.data
  }

  return data as PerformanceGoal
}

export async function updateGoalDocument(id: string, document_url: string, document_name: string) {
  const { data: existing } = await supabase
    .from('performance_goals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const docMeta = JSON.stringify({ url: document_url, name: document_name || 'Goal Document' })
  const cleanDesc = (existing?.description || '').replace(/\[DOC:(\{.*?\})\]/g, '').trim()
  const formattedDesc = `${cleanDesc} [DOC:${docMeta}]`.trim()

  const payload: any = {
    description: formattedDesc,
    document_url,
    document_name,
  }

  let { data, error } = await supabase
    .from('performance_goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    delete payload.document_url
    delete payload.document_name
    const retryRes = await supabase
      .from('performance_goals')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (retryRes.error) throw retryRes.error
    data = retryRes.data
  }

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
  date_of_birth?: string
  dob?: string
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
  const refId = input.reference_id || input.temp_id || `CAND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  const atsScore = input.ats_score || Math.floor(Math.random() * 35) + 65
  const dobVal = input.date_of_birth || input.dob || '2000-01-01'

  const baseCandidate = {
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    job_opening_id: input.job_opening_id || null,
    status: input.status || 'applied',
    stage: input.status || 'Applied',
    source: input.source || `HR Entry (ATS: ${atsScore}) | Ref: ${refId}`,
    resume_url: input.resume_url || null,
    cover_letter: input.cover_letter || null,
    date_of_birth: dobVal,
    dob: dobVal,
  }

  const fullCandidate = {
    ...baseCandidate,
    reference_id: refId,
    temp_id: refId,
    ats_score: atsScore,
    category: 'Fresher',
    password: dobVal,
  }

  let { data, error } = await supabase.from('candidates').insert(fullCandidate).select('*, job_opening:job_openings(title)').single()
  if (error) {
    const fallbackRes = await supabase.from('candidates').insert(baseCandidate).select('*, job_opening:job_openings(title)').single()
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

  const { data, error } = await supabase
    .from('candidates')
    .update(payload)
    .eq('id', id)
    .select('*, job_opening:job_openings(title)')
    .single()
  if (error) throw error

  // Forward email alert to candidate
  try {
    if (data?.email) {
      sendCandidateStatusAlertEmail({
        candidateName: data.name,
        candidateEmail: data.email,
        jobTitle: (data.job_opening as any)?.title || 'Open Position',
        referenceId: data.reference_id || data.temp_id || data.id.slice(0, 8).toUpperCase(),
        dateOfBirth: data.date_of_birth,
        status,
      }).catch((e) => console.warn('Candidate status email dispatch notice:', e))
    }
  } catch (emailErr) {
    console.warn('Status change email alert notice:', emailErr)
  }

  return data as Candidate
}

export async function updateCandidateStage(id: string, stage: string, rating?: number, notes?: string) {
  const { data, error } = await supabase
    .from('candidates')
    .update({ stage, status: stage, rating: rating ?? null, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, job_opening:job_openings(title)')
    .single()
  if (error) throw error

  try {
    if (data?.email) {
      sendCandidateStatusAlertEmail({
        candidateName: data.name,
        candidateEmail: data.email,
        jobTitle: (data.job_opening as any)?.title || 'Open Position',
        referenceId: data.reference_id || data.temp_id || data.id.slice(0, 8).toUpperCase(),
        dateOfBirth: data.date_of_birth,
        status: stage,
        feedback: notes || undefined,
      }).catch((e) => console.warn('Stage change email alert notice:', e))
    }
  } catch (err) {
    console.warn('updateCandidateStage email error:', err)
  }

  return data as Candidate
}

export async function deleteCandidate(id: string) {
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) throw error
}

export function parseInterviewRecord(row: any): Interview {
  let reschedule_reason = row.reschedule_reason || null
  let reschedule_preferred_time = row.reschedule_preferred_time || null
  let reschedule_admin_note = row.reschedule_admin_note || null

  if (row.feedback && typeof row.feedback === 'string' && row.feedback.includes('[RESCHEDULE_REQ:')) {
    const match = row.feedback.match(/\[RESCHEDULE_REQ:\s*preferred=([^|]*)\|reason=([^\]]*)\]/)
    if (match) {
      if (!reschedule_preferred_time) reschedule_preferred_time = match[1]?.trim()
      if (!reschedule_reason) reschedule_reason = match[2]?.trim()
    }
  }

  return {
    ...row,
    reschedule_reason,
    reschedule_preferred_time,
    reschedule_admin_note,
  } as Interview
}

export async function fetchInterviews(): Promise<Interview[]> {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidate:candidates(name, email, phone), job_opening:job_openings(title), interviewer:employees(first_name, last_name)')
      .order('scheduled_at', { ascending: false })
    if (!error && data !== null) {
      return data.map(parseInterviewRecord)
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
      updatePayload.stage = 'Screening'
    } else if (isHrRound) {
      updatePayload.status = 'HR Round'
      updatePayload.stage = 'HR Round'
    } else {
      updatePayload.status = 'Interview Scheduled'
      updatePayload.stage = 'Interview Scheduled'
    }
    await supabase.from('candidates').update(updatePayload).eq('id', input.candidate_id)

    // Queue and dispatch email invitation
    const { data: cand } = await supabase
      .from('candidates')
      .select('name, email, reference_id, date_of_birth, job_opening:job_openings(title)')
      .eq('id', input.candidate_id)
      .maybeSingle()

    if (cand?.email) {
      sendInterviewScheduledAlertEmail({
        candidateName: cand.name,
        candidateEmail: cand.email,
        referenceId: cand.reference_id || input.candidate_id.slice(0, 8).toUpperCase(),
        dateOfBirth: cand.date_of_birth,
        jobTitle: (cand.job_opening as any)?.title || 'Open Position',
        roundName: input.round || 'Technical',
        scheduledAt: input.scheduled_at,
        mode: input.mode || 'online',
        meetingLink: input.meeting_link || input.exam_link || undefined,
      }).catch((e) => console.warn('Interview scheduled email notice:', e))
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
  let combinedFeedback = feedback?.trim() || ''
  if (metrics && Object.keys(metrics).length > 0) {
    const metricSummary = `[Scorecard: Tech ${metrics.technical || 5}/5, Problem Solving ${metrics.problemSolving || 5}/5, Comm ${metrics.communication || 5}/5, Fit ${metrics.culturalFit || 5}/5]`
    combinedFeedback = combinedFeedback ? `${metricSummary} — ${combinedFeedback}` : metricSummary
  }

  const updateFields: Record<string, unknown> = {
    status,
    feedback: combinedFeedback || null,
    rating: rating ?? null,
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

      const candUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (roundLower.includes('screen') || roundLower.includes('exam') || roundLower.includes('round 1')) {
        if (isPassed) {
          candStatus = 'Shortlisted'
          candUpdate.exam_score = rating ? rating * 20 : 90
          candUpdate.exam_feedback = combinedFeedback || 'Screening round passed successfully.'
        } else if (isFailed) {
          candStatus = 'Rejected'
          candUpdate.exam_feedback = combinedFeedback || 'Screening round not cleared.'
        }
      } else if (roundLower.includes('hr') || roundLower.includes('round 3')) {
        if (isPassed) {
          candStatus = 'Offer Sent'
          candUpdate.hr_interview_status = 'passed'
          candUpdate.hr_interview_feedback = combinedFeedback || 'HR round cleared successfully.'
        } else if (isFailed) {
          candStatus = 'Rejected'
          candUpdate.hr_interview_status = 'failed'
          candUpdate.hr_interview_feedback = combinedFeedback || 'HR round not cleared.'
        }
      } else {
        // Technical
        if (isPassed) {
          candStatus = 'HR Round'
          candUpdate.technical_interview_status = 'passed'
          candUpdate.technical_interview_feedback = combinedFeedback || 'Technical round cleared successfully.'
        } else if (isFailed) {
          candStatus = 'Rejected'
          candUpdate.technical_interview_status = 'failed'
          candUpdate.technical_interview_feedback = combinedFeedback || 'Technical round not cleared.'
        }
      }

      candUpdate.status = candStatus
      candUpdate.stage = candStatus

      await supabase.from('candidates').update(candUpdate).eq('id', data.candidate_id)

      // Fetch candidate info and dispatch email alert
      const { data: cand } = await supabase
        .from('candidates')
        .select('name, email, reference_id, date_of_birth, job_opening:job_openings(title)')
        .eq('id', data.candidate_id)
        .maybeSingle()

      if (cand?.email) {
        const jobTitle = (cand.job_opening as any)?.title || 'Open Position'
        const refId = cand.reference_id || data.candidate_id.slice(0, 8).toUpperCase()

        if (isPassed) {
          const nextStep = roundLower.includes('hr') || roundLower.includes('round 3')
            ? 'Verification Softcopies & Formal Offer Letter'
            : roundLower.includes('screen') || roundLower.includes('exam')
              ? 'Technical Interview Round'
              : 'HR Discussion Round'

          sendRoundClearedAlertEmail({
            candidateName: cand.name,
            candidateEmail: cand.email,
            referenceId: refId,
            jobTitle,
            roundName: data.round || 'Evaluation Round',
            nextStep,
            feedback: combinedFeedback || undefined,
          }).catch((e) => console.warn('Round cleared email dispatch notice:', e))
        } else if (isFailed) {
          sendCandidateStatusAlertEmail({
            candidateName: cand.name,
            candidateEmail: cand.email,
            referenceId: refId,
            dateOfBirth: cand.date_of_birth,
            jobTitle,
            status: 'Rejected',
            feedback: combinedFeedback || undefined,
          }).catch((e) => console.warn('Interview failed email notice:', e))
        }
      }
    }
  } catch (syncErr) {
    console.warn('Candidate status sync notice:', syncErr)
  }

  return data as Interview
}

export async function rescheduleInterview(input: {
  id: string
  scheduled_at: string
  meeting_link?: string
  exam_link?: string
  admin_note?: string
  action: 'approve' | 'reschedule' | 'decline'
}) {
  const isDecline = input.action === 'decline'

  const { data: currentIv } = await supabase
    .from('interviews')
    .select('feedback')
    .eq('id', input.id)
    .single()

  const cleanFb = (currentIv?.feedback || '').replace(/\[RESCHEDULE_REQ:[^\]]*\]/g, '').trim()
  const noteTag = input.admin_note ? `[HR Note: ${input.admin_note}]` : ''
  const finalFb = cleanFb ? (noteTag ? `${cleanFb} — ${noteTag}` : cleanFb) : (noteTag || null)

  const updateFields: Record<string, unknown> = {
    reschedule_requested: false,
    reschedule_status: isDecline ? 'rejected' : 'accepted',
    feedback: finalFb,
  }

  if (!isDecline) {
    updateFields.scheduled_at = input.scheduled_at
    if (input.meeting_link) updateFields.meeting_link = input.meeting_link
    if (input.exam_link) updateFields.exam_link = input.exam_link
    updateFields.status = 'scheduled'
  } else {
    updateFields.status = 'cancelled'
  }

  const { data, error } = await supabase
    .from('interviews')
    .update(updateFields)
    .eq('id', input.id)
    .select('*, candidate:candidates(name, email, reference_id, phone), job_opening:job_openings(title)')
    .single()
  if (error) throw error

  // Sync candidate record notes & timestamp
  try {
    if (data?.candidate_id) {
      const { data: candRow } = await supabase.from('candidates').select('notes').eq('id', data.candidate_id).single()
      const noteEntry = isDecline
        ? `[HR Declined Reschedule: ${data.round}]`
        : `[HR Approved Reschedule: ${data.round} to ${input.scheduled_at}]`
      const updatedNotes = candRow?.notes ? `${candRow.notes}\n${noteEntry}` : noteEntry
      
      const candPatch: Record<string, unknown> = { 
        updated_at: new Date().toISOString(),
        notes: updatedNotes,
      }
      if (isDecline) {
        candPatch.status = 'Rejected'
        candPatch.stage = 'Rejected'
      }
      await supabase.from('candidates').update(candPatch).eq('id', data.candidate_id)
    }

    // Dispatch email alert to candidate
    const candEmail = (data as any)?.candidate?.email
    if (candEmail) {
      const candName = (data as any)?.candidate?.name || 'Candidate'
      const refId = (data as any)?.candidate?.reference_id || ''
      const jobTitle = (data as any)?.job_opening?.title || 'Open Position'

      if (!isDecline) {
        sendInterviewRescheduledAlertEmail({
          candidateName: candName,
          candidateEmail: candEmail,
          referenceId: refId,
          jobTitle,
          roundName: data.round || 'Interview',
          scheduledAt: input.scheduled_at,
          meetingLink: input.meeting_link || data.meeting_link || undefined,
          adminNote: input.admin_note || undefined,
        }).catch((e) => console.warn('Reschedule email dispatch notice:', e))
      } else {
        sendCandidateStatusAlertEmail({
          candidateName: candName,
          candidateEmail: candEmail,
          referenceId: refId,
          jobTitle,
          status: 'Rejected',
          reason: input.admin_note || 'Interview reschedule request could not be accommodated.',
        }).catch((e) => console.warn('Decline email dispatch notice:', e))
      }
    }
  } catch (syncErr) {
    console.warn('Candidate reschedule sync error:', syncErr)
  }

  return parseInterviewRecord(data)
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

    // Forward offer letter released email alert to candidate
    const { data: cand } = await supabase
      .from('candidates')
      .select('name, email, reference_id, job_opening:job_openings(title)')
      .eq('id', input.candidate_id)
      .maybeSingle()

    if (cand?.email) {
      sendOfferLetterReleasedAlertEmail({
        candidateName: cand.name || 'Candidate',
        candidateEmail: cand.email,
        referenceId: cand.reference_id || input.candidate_id.slice(0, 8).toUpperCase(),
        jobTitle: (cand.job_opening as any)?.title || 'Open Position',
        salaryOffered: input.salary_offered,
        joiningDate: input.joining_date,
      }).catch((e) => console.warn('Offer creation email dispatch notice:', e))
    }
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
  const { data, error } = await supabase.from('offers').update({ status }).eq('id', id).select('*, candidate:candidates(name, email, reference_id, job_opening:job_openings(title))').single()
  if (error) throw error

  // If status moved to issued or released, forward alert
  try {
    const cand = (data as any)?.candidate
    if (cand?.email && (status === 'issued' || status === 'released')) {
      sendOfferLetterReleasedAlertEmail({
        candidateName: cand.name || 'Candidate',
        candidateEmail: cand.email,
        referenceId: cand.reference_id || '',
        jobTitle: cand.job_opening?.title || 'Open Position',
        salaryOffered: data.salary_offered,
        joiningDate: data.joining_date,
      }).catch((e) => console.warn('Offer status update email notice:', e))
    }
  } catch {}

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

  const dateStr = new Date(input.start_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = `${new Date(input.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(input.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  // If approved immediately (Admin direct booking) -> broadcast to all users
  if (input.status === 'Approved') {
    try {
      await supabase.from('notifications').insert({
        type: 'info',
        title: `Meeting Hall Booked: ${input.title}`,
        message: `Meeting Hall reserved for "${input.title}" on ${dateStr} (${timeStr}).`,
        link: '/meeting-hall',
        is_read: false,
      })
    } catch {}
  } else {
    // Notify admin/management of pending request
    try {
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

  const dateStr = data?.start_time
    ? new Date(data.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const timeStr = data?.start_time && data?.end_time
    ? `${new Date(data.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(data.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : ''

  // Broadcast to all users if approved
  if (status === 'Approved' && data) {
    try {
      await supabase.from('notifications').insert({
        type: 'info',
        title: `Meeting Hall Booked: ${data.title}`,
        message: `Meeting Hall reserved for "${data.title}" on ${dateStr} (${timeStr}).`,
        link: '/meeting-hall',
        is_read: false,
      })
    } catch {}
  }

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

