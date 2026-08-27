// Pipeline notification engine — builds the candidate's sequential notification
// timeline in STRICT LIFO order (newest event first, "Registration Successful"
// always at the very bottom as T0). Sequential generation NEVER skips a step:
// every step is timestamp-anchored to its real/computed event time, and the
// chain halts immediately on any failed / disqualified outcome.

import type { Candidate, Interview, JobOpening } from '@/lib/database.types'

export type NotifType = 'info' | 'warning' | 'success'

export interface PipelineNotification {
  id: string
  title: string
  message: string
  type: NotifType
  is_read: boolean
  created_at: string
  timestamp: string
}

export interface PipelineInput {
  candidate: Candidate
  interviews: Interview[]
  job?: JobOpening | null
  isExperienced: boolean
  isHired: boolean
  offerAccepted: boolean
  malpracticed: boolean
  now?: Date
}

const ONE_HOUR_MS = 60 * 60 * 1000

const formatLocalTime = (dateStr?: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : ''

const extOf = (c: Candidate) =>
  c as Candidate & {
    exam_started_at?: string | null
    technical_interview_status?: string | null
    technical_interview_time?: string | null
    technical_interview_rescheduled?: boolean
    hr_interview_status?: string | null
    hr_interview_time?: string | null
    hr_interview_rescheduled?: boolean
    exam_feedback?: string | null
  }

interface Step {
  id: string
  title: string
  message: string
  type: NotifType
  iso: string
}

const statusCleared = (status?: string | null) => ['passed', 'cleared', 'completed'].includes((status ?? '').toLowerCase())
const statusFailed = (status?: string | null) => (status ?? '').toLowerCase() === 'failed'

/**
 * Walk the sequential pipeline for a candidate snapshot and return the fully
 * generated notification list, newest-first. Used by both the candidate portal
 * (panel hydration) and the live toast engine guard.
 */
export function buildPipelineNotifications(input: PipelineInput): PipelineNotification[] {
  const { candidate, interviews, isExperienced, isHired, offerAccepted, malpracticed } = input
  const nowMs = (input.now ?? new Date()).getTime()
  const ext = extOf(candidate)

  // Canonical exam schedule — strict precedence: new columns → legacy window fields.
  const opening = (candidate.job_opening ??
    (input.job as JobOpening | null | undefined)) as (JobOpening & {
    exam_start_time?: string | null
    exam_end_time?: string | null
    pass_percentage?: number | null
    exam_passing_score?: number | null
    total_questions?: number | null
  }) | null | undefined

  const examStartRaw = opening?.exam_start_date ?? opening?.exam_window_start ?? opening?.exam_start_time
  const examEndRaw = opening?.exam_end_date ?? opening?.exam_window_end ?? opening?.exam_end_time
  const examStartMs = examStartRaw ? new Date(examStartRaw).getTime() : 0

  const totalQuestions = opening?.total_questions
  const passPercent = opening?.pass_percentage ?? opening?.exam_passing_score
  const calculatedExamPercentage =
    totalQuestions != null && totalQuestions > 0 && candidate.exam_score != null
      ? Math.round((candidate.exam_score / totalQuestions) * 100)
      : 0
  const examPassed = passPercent != null && calculatedExamPercentage >= passPercent

  // Round records + candidate-bound canonical dates (technical_interview_date /
  // hr_interview_date are written at booking time and by the admin scheduler).
  const findRow = (round: 'Technical' | 'HR') =>
    interviews.find(
      (i) => i.round === round && ['passed', 'completed', 'cleared', 'failed'].includes((i.status ?? '').toLowerCase())
    )
  const findBookedRow = (round: 'Technical' | 'HR') =>
    interviews.find((i) => i.round === round && i.status === 'scheduled' && i.candidate_confirmed === true)

  const technicalDateRaw = candidate.technical_interview_date ?? findBookedRow('Technical')?.scheduled_at ?? ext.technical_interview_time
  const hrDateRaw = candidate.hr_interview_date ?? findBookedRow('HR')?.scheduled_at ?? ext.hr_interview_time
  const technicalDateMs = technicalDateRaw ? new Date(technicalDateRaw).getTime() : 0
  const hrDateMs = hrDateRaw ? new Date(hrDateRaw).getTime() : 0

  const technicalRow = findRow('Technical')
  const hrRow = findRow('HR')
  const extTechRow = technicalRow
    ? (technicalRow as Interview & { reschedule_requested?: boolean | null; reschedule_status?: string | null })
    : null
  const extHrRow = hrRow
    ? (hrRow as Interview & { reschedule_requested?: boolean | null; reschedule_status?: string | null })
    : null

  const technicalCleared = statusCleared(ext.technical_interview_status) || statusCleared(technicalRow?.status)
  const technicalFailed = statusFailed(ext.technical_interview_status) || statusFailed(technicalRow?.status)
  const hrCleared = statusCleared(ext.hr_interview_status) || statusCleared(hrRow?.status)
  const hrFailed = statusFailed(ext.hr_interview_status) || statusFailed(hrRow?.status)

  const registrationRaw = candidate.applied_at
  const registrationMs = registrationRaw ? new Date(registrationRaw).getTime() : nowMs

  // ---- Sequential generation — each step is forced onto a strictly increasing
  // ---- timestamp chain so the final LIFO sort is deterministic.
  const steps: Array<Step & { ms: number }> = []
  let halted = false
  let prevMs = registrationMs

  const chain = (
    id: string,
    title: string,
    message: string,
    type: NotifType,
    rawIso?: string | null
  ) => {
    if (halted) return
    const rawMs = rawIso ? new Date(rawIso).getTime() : nowMs
    const ms = Math.max(Number.isFinite(rawMs) ? rawMs : nowMs, prevMs + 1000)
    prevMs = ms
    steps.push({ id, title, message, type, iso: new Date(ms).toISOString(), ms })
  }

  // 1 — Registration Successful (T0, always at the very bottom).
  chain(
    'registration',
    'Registration Successful',
    isExperienced
      ? 'Registration Successful. Please schedule your slot for the Technical Interview.'
      : 'Registration Successful.',
    'success',
    new Date(registrationMs).toISOString()
  )

  if (!halted && !isExperienced && examStartRaw) {
    // 2 — Online Exam Scheduled (anchored to exam_start_date).
    chain('exam-scheduled', 'Online Exam Scheduled', `Online Exam Scheduled for ${formatLocalTime(examStartRaw)}.`, 'info', examStartRaw)
    // 3 — Online Exam 1-Hour Reminder — appears once the live clock crosses start − 1h.
    const reminderMs = examStartMs - ONE_HOUR_MS
    if (nowMs >= reminderMs && nowMs < examStartMs) {
      chain('exam-reminder', 'Online Exam Reminder', 'Your Online Exam will commence in 1 hour.', 'warning', new Date(reminderMs).toISOString())
    }
    // Exam closed, never attempted — halt the chain.
    if (examEndRaw && new Date(examEndRaw).getTime() < nowMs && candidate.exam_completed_at == null && candidate.exam_score == null && ext.exam_started_at == null) {
      chain('exam-expired', 'Exam Window Closed', 'You did not complete the assessment within the designated window and are no longer eligible for subsequent rounds.', 'warning', examEndRaw)
      halted = true
    }
    // 4 — Online Exam Cleared (Fresher only) — fired only once a real score is
    // recorded; an un-scored submission stays in "awaiting evaluation".
    if (candidate.exam_score != null) {
      chain(
        'exam-result',
        examPassed ? 'Online Exam Cleared' : 'Online Exam Status Update',
        examPassed
          ? 'You cleared the Online Exam! Please schedule your slot for the Technical Interview.'
          : 'You did not qualify the Online Exam.',
        examPassed ? 'success' : 'warning',
        candidate.exam_completed_at
      )
      if (!examPassed) halted = true
    }
  }

  if (!halted && technicalDateRaw) {
    // 5 — Technical Interview Scheduled.
    chain('tech-scheduled', 'Technical Interview Scheduled', `Technical Interview Scheduled for ${formatLocalTime(technicalDateRaw)}.`, 'info', technicalDateRaw)
    // 6 — Technical Interview 1-Hour Reminder.
    const reminderMs = technicalDateMs - ONE_HOUR_MS
    if (nowMs >= reminderMs && nowMs < technicalDateMs) {
      chain('tech-reminder', 'Technical Interview Reminder', 'Your Technical Interview will commence in 1 hour.', 'warning', new Date(reminderMs).toISOString())
    }
    if (extTechRow?.reschedule_status === 'accepted') {
      // 7 — Technical Round Rescheduled.
      chain('tech-rescheduled', 'Technical Round Rescheduled', `Technical Round Rescheduled successfully for ${formatLocalTime(technicalRawOf(findBookedRow('Technical')))}.`, 'info', extTechRow.scheduled_at)
    }
  }

  if (!halted && (technicalCleared || technicalFailed)) {
    // 8 — Technical Round Cleared (+ HR scheduling prompt) / failure → halt.
    if (technicalCleared) {
      chain(
        'tech-outcome',
        'Technical Round Cleared',
        'Congratulations! You have qualified the Technical Round. Please schedule your slot for the HR Round.',
        'success',
        technicalRow?.created_at
      )
    } else {
      chain('tech-fail', 'Technical Round Result', 'You did not clear the Technical Round.', 'warning', technicalRow?.created_at)
      halted = true
    }
  }

  if (malpracticed && !halted) {
    chain('disqualified', 'Disqualified', 'Your application has been disqualified due to a detected malpractice or AI tool violation during the assessment process.', 'warning')
    halted = true
  }

  if (!halted && hrDateRaw) {
    // 9 — HR Interview Scheduled.
    chain('hr-scheduled', 'HR Interview Scheduled', `HR Interview Scheduled for ${formatLocalTime(hrDateRaw)}.`, 'info', hrDateRaw)
    // 10 — HR Interview 1-Hour Reminder.
    const reminderMs = hrDateMs - ONE_HOUR_MS
    if (nowMs >= reminderMs && nowMs < hrDateMs) {
      chain('hr-reminder', 'HR Interview Reminder', 'Your HR Interview will commence in 1 hour.', 'warning', new Date(reminderMs).toISOString())
    }
    if (extHrRow?.reschedule_status === 'accepted') {
      chain('hr-rescheduled', 'HR Round Rescheduled', `HR Round Rescheduled successfully for ${formatLocalTime(hrRawOf(findBookedRow('HR')))}.`, 'info', extHrRow.scheduled_at)
    }
  }

  if (!halted && (hrCleared || hrFailed || malpracticed)) {
    // 11 — Final HR Outcome (Qualified / Disqualified) — terminal step.
    if (hrCleared) {
      chain('hr-outcome', 'Qualified', 'Congratulations! You have qualified the HR Round. Please review the terms and conditions for further steps.', 'success', hrRow?.created_at)
    } else {
      chain('hr-fail', 'Disqualified', 'You did not clear the HR Round.', 'warning', hrRow?.created_at)
      halted = true
    }
  }

  // Offer accepted → hired (final optional step).
  if (isHired && offerAccepted) {
    chain('hired', 'Offer Accepted - Hired!', 'Congratulations! You have cleared all rounds and accepted the offer. You are hired!', 'success')
  }

  // Strict LIFO — descending timestamps; registration (oldest, T0) is last.
  return steps
    .sort((a, b) => b.ms - a.ms)
    .map((s) => ({
      id: s.id,
      title: s.title,
      message: s.message,
      type: s.type,
      is_read: false,
      created_at: s.iso,
      timestamp: formatLocalTime(s.iso),
    }))
}

function technicalRawOf(row?: Interview | null): string | null {
  return row?.scheduled_at ?? null
}

function hrRawOf(row?: Interview | null): string | null {
  return row?.scheduled_at ?? null
}