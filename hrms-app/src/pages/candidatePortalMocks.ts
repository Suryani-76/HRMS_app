// ============================================================================
// Candidate Portal — LEGACY mock data, kept for testing / storybook / fallback
// demos ONLY. The live portal (CandidatePortalPage) now runs on Supabase via
// @/lib/api/candidatePortal — do NOT import this file from production code.
// Every scenario snapshot is a complete portal state: candidate profile, job
// opening (incl. exam window), interview records, published slot pools, and
// the offer. Timestamps are relative to Date.now() so every state stays live
// in the browser at any time.
// ============================================================================

export const MIN = 60_000
export const HOUR = 3_600_000
export const DAY = 86_400_000

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockInterviewer {
  first_name: string
  last_name: string
}

export interface MockInterview {
  id: string
  candidate_id: string
  job_opening_id: string | null
  interviewer: MockInterviewer | null
  round: 'Technical' | 'HR'
  scheduled_at: string | null
  mode: string
  meeting_link: string | null
  status: 'scheduled' | 'ongoing' | 'cancelled' | 'proposed' | 'passed' | 'failed' | 'completed' | null
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

export interface MockCandidate {
  id: string
  candidate_id: string
  user_id: string | null
  name: string
  email: string
  category: 'Fresher' | 'Experienced'
  status: 'applied' | 'rejected' | 'hired' | 'passed' | 'failed' | 'booked' | 'scheduled' | 'ongoing' | 'cancelled' | 'proposed' | 'completed'
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

// Rich exam metadata + guidelines. Every guideline string is authored here so
// the page only renders what this snapshot defines.
export interface MockExamDetails {
  duration_mins: number
  total_questions: number
  total_marks: number
  pass_percentage: number
  window_start: string | null
  window_end: string | null
  guidelines: string[]
}

export interface MockJobOpening {
  id: string
  title: string
  exam_start_date: string | null
  exam_end_date: string | null
  exam_start_time: string | null
  exam_end_time: string | null
  exam_window_start: string | null
  exam_window_end: string | null
  total_questions: number
  total_marks: number
  pass_percentage: number
  exam_duration_mins: number
  exam_link: string
  exam_details: MockExamDetails
}

export interface MockSalaryBreakdown {
  base_salary: number
  variable: number
  allowances: number
  gross_total: number
}

export interface MockOffer {
  id: string
  candidate_id: string
  job_opening_id: string | null
  // Admin-published offer document — the portal embeds/downloads this PDF.
  pdf_url: string | null
  document_title: string
  // Admin-authored Terms & Conditions content and checklist.
  terms_content_html: string
  terms_checkbox_labels: Array<string | null>
  salary_offered: number
  joining_date: string
  service_bond_years: number | null
  relocation_required: boolean
  relocation_location: string | null
  salary_breakdown: MockSalaryBreakdown
  status: 'sent' | 'accepted' | 'rejected'
  candidate_response: 'accept' | 'discuss' | 'reject' | null
  created_at: string
}

export interface MockInterviewSlot {
  id: string
  job_opening_id: string | null
  round: 'technical' | 'hr'
  scheduled_at: string
  status: 'open' | 'closed'
  max_candidates: number
  booked: number
}

export interface PortalSnapshot {
  id: string
  label: string
  description: string
  group: 'Fresher' | 'Experienced' | 'Outcome' | 'Offer & Onboarding'
  candidate: MockCandidate
  job: MockJobOpening
  interviews: MockInterview[]
  slots: MockInterviewSlot[]
  offer: MockOffer | null
  // Admin-authored Terms & Conditions used before an offer document exists.
  terms_content_html?: string
  terms_checkbox_labels?: Array<string | null>
}

// ---------------------------------------------------------------------------
// Factories — shared building blocks
// ---------------------------------------------------------------------------

const fresherBase = (overrides: Partial<MockCandidate> = {}): MockCandidate => ({
  id: 'cand-fresher-001',
  candidate_id: 'CAND-FR-2026-001',
  user_id: null,
  name: 'Ananya Sharma',
  email: 'ananya.sharma@example.com',
  category: 'Fresher',
  status: 'passed',
  applied_at: iso(-6 * DAY),
  created_at: iso(-6 * DAY),
  exam_score: 85, // 85% score
  exam_started_at: iso(-2 * DAY),
  exam_completed_at: iso(-2 * DAY + 45 * 60 * 1000), // Completed 45 mins later
  exam_feedback: 'Qualified for Technical Interview round.',
  technical_interview_status: 'scheduled', // Matched standard portal enum ('scheduled' | 'ongoing' | 'passed' | 'failed')
  technical_interview_feedback: null,
  technical_interview_time: iso(2 * DAY + 45 * 60 * 1000),
  technical_interview_date: iso(2 * DAY + 45 * 60 * 1000),
  technical_interview_rescheduled: null,
  hr_interview_status: null,
  hr_interview_feedback: null,
  hr_interview_time: null,
  hr_interview_date: null,
  hr_interview_rescheduled: null,
  malpractice_flag: false,
  cheating_detected: false,
  disqualified_at: null,
  disqualified_reason: null,
  ...overrides,
})

const experiencedBase = (overrides: Partial<MockCandidate> = {}): MockCandidate => ({
  ...fresherBase({ id: 'cand-exp-001', candidate_id: 'CAND-EX-2026-014', name: 'Rohit Verma', email: 'rohit.verma@example.com', category: 'Experienced' }),
  ...overrides,
})

type MockJobOpeningFlat = Omit<MockJobOpening, 'exam_details'>

const buildExamDetails = (job: MockJobOpeningFlat): MockExamDetails => ({
  duration_mins: job.exam_duration_mins,
  total_questions: job.total_questions,
  total_marks: job.total_marks,
  pass_percentage: job.pass_percentage,
  window_start: job.exam_start_date ?? job.exam_window_start ?? job.exam_start_time,
  window_end: job.exam_end_date ?? job.exam_window_end ?? job.exam_end_time,
  guidelines: [
    'Ensure a stable internet connection with a minimum speed of 2 Mbps.',
    'Supported Browsers: Latest versions of Google Chrome or Mozilla Firefox.',
    'Proctoring Notice: Web camera and microphone access are required. Navigating away from the exam tab or opening multiple tabs will trigger malpractice warnings.',
    'Submission Policy: The assessment will automatically submit when the timer expires.',
    'Calculator / Note-taking: Scratchpad and built-in calculator will be provided inside the exam interface.',
  ],
})

const jobBase = (overrides: Partial<MockJobOpening> = {}): MockJobOpening => {
  const flat: MockJobOpeningFlat = {
    id: 'job-opening-001',
    title: 'Software Engineer',
    exam_start_date: iso(1 * DAY),
    exam_end_date: iso(2 * DAY),
    exam_start_time: null,
    exam_end_time: null,
    exam_window_start: null,
    exam_window_end: null,
    total_questions: 45,
    total_marks: 100,
    pass_percentage: 70,
    exam_duration_mins: 60,
    exam_link: 'https://example.com/exam/portal',
    ...overrides,
  }
  return { ...flat, exam_details: buildExamDetails(flat) }
}

const noExam = (job: MockJobOpening): MockJobOpening => ({
  ...job,
  exam_start_date: null,
  exam_end_date: null,
  exam_details: { ...job.exam_details, window_start: null, window_end: null },
})

const technicalRecord = (
  id: string,
  candidate: MockCandidate,
  job: MockJobOpening,
  overrides: Partial<MockInterview> = {}
): MockInterview => ({
  id,
  candidate_id: candidate.id,
  job_opening_id: job.id,
  interviewer: { first_name: 'Priya', last_name: 'Menon' },
  round: 'Technical',
  scheduled_at: null,
  mode: 'online',
  meeting_link: 'https://meet.google.com/tech-demo',
  status: null,
  candidate_confirmed: false,
  attended_at: null,
  created_at: iso(-2 * DAY),
  updated_at: iso(-2 * DAY),
  reschedule_requested: false,
  reschedule_status: null,
  reschedule_reason: null,
  reschedule_preferred_time: null,
  reschedule_admin_note: null,
  feedback: null,
  rating: null,
  metrics: null,
  slot_key: null,
  ...overrides,
})

const hrRecord = (
  id: string,
  candidate: MockCandidate,
  job: MockJobOpening,
  overrides: Partial<MockInterview> = {}
): MockInterview => ({
  ...technicalRecord(id, candidate, job, overrides),
  round: 'HR',
  meeting_link: 'https://meet.google.com/hr-demo',
  interviewer: { first_name: 'Suresh', last_name: 'Iyer' },
})

const publishedSlots = (
  round: 'technical' | 'hr',
  dayOffsets: number[],
  maxCandidates = 5,
  bookedCount = 0
): MockInterviewSlot[] =>
  dayOffsets.map((d, i) => ({
    id: `slot-${round}-${i + 1}`,
    job_opening_id: 'job-opening-001',
    round,
    scheduled_at: iso(d * DAY + 10 * HOUR),
    status: 'open',
    max_candidates: maxCandidates,
    booked: bookedCount,
  }))

// ---------------------------------------------------------------------------
// Admin-published offer assets — the portal renders these exactly as provided
// (embedded PDF, HTML terms body, and the acceptance checklist).
// ---------------------------------------------------------------------------

// Stable public sample PDF so the embedded preview renders in the demo.
const OFFER_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

const OFFER_TERMS_HTML = `
  <div class="mb-3">
    <div class="mb-1 font-semibold">Service Bond & Policies</div>
    <p class="text-muted-foreground">As part of this offer you agree to serve the service bond set out in your appointment letter. Early separation within the bond period is governed by the bond terms communicated by the HR team.</p>
  </div>
  <div class="mb-3">
    <div class="mb-1 font-semibold">Document Verification</div>
    <p class="text-muted-foreground">All documents submitted during the application and onboarding process must be genuine and verifiable. Any discrepancy discovered at any stage will result in termination of employment and legal action as applicable.</p>
  </div>
  <div class="mb-3">
    <div class="mb-1 font-semibold">Workplace Policy</div>
    <p class="text-muted-foreground">This role supports the company work policy (Remote / Hybrid / On-site) as per role requirements. Your work mode may be adjusted by the company with due notice.</p>
  </div>
  <div class="mb-3">
    <div class="mb-1 font-semibold">Code of Conduct</div>
    <p class="text-muted-foreground">You agree to uphold the company code of conduct, including confidentiality of company and client information, compliance with security policies, non-disclosure agreements, and professional behaviour consistent with company values.</p>
  </div>
  <div class="mb-3">
    <div class="mb-1 font-semibold">Compensation & Joining</div>
    <p class="text-muted-foreground">Your annual CTC and expected joining date are communicated in the offer document. The breakdown is indicative; the final structure will be confirmed in your appointment letter.</p>
  </div>
`

const OFFER_TERMS_LABELS: Array<string | null> = [
  'I agree to the service bond duration and policies.',
  'I confirm that all uploaded documents are genuine.',
  'I accept the workplace policy (Remote / Hybrid / On-site).',
  'I accept the company code of conduct.',
  'I agree to the offered compensation (CTC) structure and joining date as mentioned in the offer letter.',
]

const buildOffer = (
  candidate: MockCandidate,
  job: MockJobOpening,
  overrides: Partial<MockOffer> = {}
): MockOffer => ({
  id: 'offer-001',
  candidate_id: candidate.id,
  job_opening_id: job.id,
  pdf_url: OFFER_PDF_URL,
  document_title: 'Offer of Employment',
  terms_content_html: OFFER_TERMS_HTML,
  terms_checkbox_labels: OFFER_TERMS_LABELS,
  salary_offered: 600000,
  joining_date: iso(30 * DAY),
  service_bond_years: 2,
  relocation_required: false,
  relocation_location: null,
  salary_breakdown: { base_salary: 450000, variable: 60000, allowances: 90000, gross_total: 600000 },
  status: 'sent',
  candidate_response: null,
  created_at: iso(-1 * DAY),
  ...overrides,
})

// Terminal scorecard rows used by the Passed / Failed / Cleared scenarios.
const passedScorecard = (rating = 4, feedback = 'Strong problem-solving and communication skills.'): Partial<MockInterview> => ({
  status: 'passed',
  candidate_confirmed: true,
  attended_at: iso(-1 * HOUR),
  feedback,
  rating,
  metrics: { 'Communication': rating, 'Technical Depth': rating, 'Problem Solving': rating, 'Culture Fit': rating },
})

const failedScorecard = (feedback = 'Needs more depth in core computer science fundamentals.'): Partial<MockInterview> => ({
  status: 'failed',
  candidate_confirmed: true,
  attended_at: iso(-1 * HOUR),
  feedback,
  rating: 2,
  metrics: { 'Communication': 3, 'Technical Depth': 2, 'Problem Solving': 2, 'Culture Fit': 3 },
})

// ---------------------------------------------------------------------------
// Full scenario snapshots
// ---------------------------------------------------------------------------

export const MOCK_SCENARIOS: PortalSnapshot[] = [
  // ============================ FRESHER — Exam ============================
  {
    id: 'fresher-fresh',
    label: 'Fresher: Exam Upcoming / Scheduled',
    description: 'Exam scheduled tomorrow. Tech/HR slot pools open, nothing booked yet.',
    group: 'Fresher',
    candidate: fresherBase(),
    job: jobBase(),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-live',
    label: 'Fresher: Exam LIVE Now',
    description: 'Exam window is open right now — Take Exam is available.',
    group: 'Fresher',
    candidate: fresherBase(),
    job: jobBase({ exam_start_date: iso(-30 * MIN), exam_end_date: iso(2 * HOUR) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-ongoing',
    label: 'Fresher — Exam Ongoing (Writing)',
    description: 'Exam started; candidate is mid-attempt.',
    group: 'Fresher',
    candidate: fresherBase({ exam_started_at: iso(-12 * MIN) }),
    job: jobBase({ exam_start_date: iso(-30 * MIN), exam_end_date: iso(2 * HOUR) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-awaiting',
    label: 'Fresher: Exam Completed — Awaiting Results',
    description: 'Attempt recorded; evaluation not published yet.',
    group: 'Fresher',
    candidate: fresherBase({ exam_started_at: iso(-2 * HOUR), exam_completed_at: iso(-1 * HOUR) }),
    job: jobBase({ exam_start_date: iso(-3 * HOUR), exam_end_date: iso(5 * HOUR) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-passed',
    label: 'Fresher: Exam Passed',
    description: 'Exam cleared (above cutoff). Technical slots open — progress shows 1/3.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-failed',
    label: 'Fresher: Exam Failed / Not Cleared',
    description: 'Score below cutoff — red failure banner shows ONLY inside the Stage 1 card.',
    group: 'Outcome',
    candidate: fresherBase({
      status: 'rejected',
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 18,
      exam_feedback: 'Below the required passing cutoff.',
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-exam-expired',
    label: 'Fresher — Exam Expired (Unattempted)',
    description: 'Window closed with no attempt — no longer eligible, pipeline stopped.',
    group: 'Outcome',
    candidate: fresherBase({ status: 'rejected' }),
    job: jobBase({ exam_start_date: iso(-2 * DAY), exam_end_date: iso(-1 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },

  // ========================== FRESHER — Technical =========================
  {
    id: 'fresher-tech-open',
    label: 'Fresher: Passed Exam — Tech Slot Booking Open',
    description: 'Exam cleared; book a Technical slot.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-tech-live',
    label: 'Fresher: Tech Interview LIVE Now',
    description: 'Exam cleared; Technical call is in progress — join the meeting link now.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-4 * DAY),
      exam_completed_at: iso(-4 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'ongoing',
      technical_interview_feedback: null,
      technical_interview_time: iso(-30 * MIN),
      technical_interview_date: iso(-30 * MIN),
    }),
    job: jobBase({ exam_start_date: iso(-5 * DAY), exam_end_date: iso(-4 * DAY) }),
    interviews: [
      technicalRecord('tech-live-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-30 * MIN),
        status: 'ongoing',
        candidate_confirmed: true,
        attended_at: iso(-10 * MIN),
        slot_key: 'slot-technical-1',
      }),
    ],
    slots: [...publishedSlots('hr', [2, 3])],
    offer: null,
  },
  {
    id: 'fresher-tech-slots-expired',
    label: 'Fresher — All Tech Slots Expired',
    description: 'Every published slot is in the past — booking shows "No Available Slots".',
    group: 'Outcome',
    candidate: fresherBase({
      exam_started_at: iso(-5 * DAY),
      exam_completed_at: iso(-5 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
    }),
    job: jobBase({ exam_start_date: iso(-6 * DAY), exam_end_date: iso(-5 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [-2, -1]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-tech-booked',
    label: 'Fresher — Tech Booked & Confirmed',
    description: 'Confirmed slot in 3 hours — reschedule/cancel available, attend unlocks in 5 min.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'scheduled',
      technical_interview_date: iso(3 * HOUR),
      technical_interview_time: iso(3 * HOUR),
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [
      technicalRecord('tech-booked-1', fresherBase(), jobBase(), {
        scheduled_at: iso(3 * HOUR),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-1',
      }),
    ],
    slots: [
      { id: 'slot-technical-1', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(3 * HOUR), status: 'open', max_candidates: 5, booked: 1 },
      { id: 'slot-technical-2', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(2 * DAY), status: 'open', max_candidates: 5, booked: 0 },
    ],
    offer: null,
  },
  {
    id: 'fresher-tech-resched-pending',
    label: 'Fresher — Reschedule Request Pending',
    description: 'Request under admin review; original slot stays confirmed.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'scheduled',
      technical_interview_date: iso(2 * DAY),
      technical_interview_time: iso(2 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [
      technicalRecord('tech-resched-pending-1', fresherBase(), jobBase(), {
        scheduled_at: iso(2 * DAY),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-2',
        reschedule_requested: true,
        reschedule_status: 'pending',
        reschedule_reason: 'Official university exam scheduled at the same time.',
        reschedule_preferred_time: iso(4 * DAY),
      }),
    ],
    slots: [
      { id: 'slot-technical-1', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(3 * HOUR), status: 'open', max_candidates: 5, booked: 0 },
      { id: 'slot-technical-2', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(2 * DAY), status: 'open', max_candidates: 5, booked: 1 },
    ],
    offer: null,
  },
  {
    id: 'fresher-tech-resched-accepted',
    label: 'Fresher — Reschedule Accepted',
    description: 'Admin approved; new time shown as confirmed.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'scheduled',
      technical_interview_date: iso(2 * DAY),
      technical_interview_time: iso(2 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [
      technicalRecord('tech-resched-accepted-1', fresherBase(), jobBase(), {
        scheduled_at: iso(2 * DAY),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-3',
        reschedule_requested: false,
        reschedule_status: 'accepted',
        reschedule_reason: 'Client call overlap.',
        reschedule_preferred_time: iso(2 * DAY),
      }),
    ],
    slots: [
      { id: 'slot-technical-3', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(2 * DAY), status: 'open', max_candidates: 5, booked: 1 },
    ],
    offer: null,
  },
  {
    id: 'fresher-tech-resched-rejected',
    label: 'Fresher — Reschedule Rejected',
    description: 'Admin rejected; original time remains with admin note.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-2 * DAY),
      exam_completed_at: iso(-2 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'scheduled',
      technical_interview_date: iso(3 * HOUR),
      technical_interview_time: iso(3 * HOUR),
    }),
    job: jobBase({ exam_start_date: iso(-3 * DAY), exam_end_date: iso(-2 * DAY) }),
    interviews: [
      technicalRecord('tech-resched-rejected-1', fresherBase(), jobBase(), {
        scheduled_at: iso(3 * HOUR),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-1',
        reschedule_requested: false,
        reschedule_status: 'rejected',
        reschedule_reason: 'No interviewer availability.',
        reschedule_preferred_time: iso(1 * DAY),
        reschedule_admin_note: 'No panel availability next week. Please keep the confirmed slot.',
      }),
    ],
    slots: [
      { id: 'slot-technical-1', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(3 * HOUR), status: 'open', max_candidates: 5, booked: 1 },
    ],
    offer: null,
  },
  {
    id: 'fresher-tech-missed',
    label: 'Fresher — Missed Tech Slot (No-Show)',
    description: 'Booked slot elapsed without attending — cannot attend, pipeline stopped.',
    group: 'Outcome',
    candidate: fresherBase({
      status: 'rejected',
      exam_started_at: iso(-3 * DAY),
      exam_completed_at: iso(-3 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'scheduled',
      technical_interview_date: iso(-3 * HOUR),
      technical_interview_time: iso(-3 * HOUR),
      disqualified_at: iso(-3 * HOUR),
      disqualified_reason: 'You did not attend the Technical interview within its scheduled window.',
    }),
    job: jobBase({ exam_start_date: iso(-4 * DAY), exam_end_date: iso(-3 * DAY) }),
    interviews: [
      technicalRecord('tech-missed-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-3 * HOUR),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-1',
        attended_at: null,
      }),
    ],
    slots: [
      { id: 'slot-technical-1', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(-3 * HOUR), status: 'open', max_candidates: 5, booked: 1 },
    ],
    offer: null,
  },
  {
    id: 'fresher-tech-passed',
    label: 'Fresher: Passed Tech — HR Slot Booking Open',
    description: 'Technical cleared with scorecard — HR slots open, progress shows 2/3.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-4 * DAY),
      exam_completed_at: iso(-4 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Strong problem-solving and communication skills.',
      technical_interview_time: iso(-2 * DAY),
      technical_interview_date: iso(-2 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-5 * DAY), exam_end_date: iso(-4 * DAY) }),
    interviews: [
      technicalRecord('tech-passed-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-2 * DAY),
        slot_key: 'slot-technical-1',
        ...passedScorecard(4),
      }),
    ],
    slots: [...publishedSlots('hr', [2, 3])],
    offer: null,
  },
  {
    id: 'fresher-hr-booked',
    label: 'Fresher — HR Booked & Confirmed',
    description: 'HR slot confirmed in 5 hours.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-5 * DAY),
      exam_completed_at: iso(-5 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Strong problem-solving and communication skills.',
      technical_interview_time: iso(-3 * DAY),
      technical_interview_date: iso(-3 * DAY),
      hr_interview_status: 'scheduled',
      hr_interview_date: iso(5 * HOUR),
      hr_interview_time: iso(5 * HOUR),
    }),
    job: jobBase({ exam_start_date: iso(-6 * DAY), exam_end_date: iso(-5 * DAY) }),
    interviews: [
      technicalRecord('tech-passed-2', fresherBase(), jobBase(), {
        scheduled_at: iso(-3 * DAY),
        slot_key: 'slot-technical-1',
        ...passedScorecard(4),
      }),
      hrRecord('hr-booked-1', fresherBase(), jobBase(), {
        scheduled_at: iso(5 * HOUR),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-hr-1',
      }),
    ],
    slots: [
      { id: 'slot-hr-1', job_opening_id: 'job-opening-001', round: 'hr', scheduled_at: iso(5 * HOUR), status: 'open', max_candidates: 5, booked: 1 },
    ],
    offer: null,
  },

  {
    id: 'fresher-hr-live',
    label: 'Fresher: HR Interview LIVE Now',
    description: 'Exam + Technical cleared (green); HR call in progress — join now.',
    group: 'Fresher',
    candidate: fresherBase({
      exam_started_at: iso(-6 * DAY),
      exam_completed_at: iso(-6 * DAY + HOUR),
      exam_score: 34,
      exam_feedback: 'Outstanding assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Strong problem-solving and communication skills.',
      technical_interview_time: iso(-3 * DAY),
      technical_interview_date: iso(-3 * DAY),
      hr_interview_status: 'ongoing',
      hr_interview_feedback: null,
      hr_interview_time: iso(-30 * MIN),
      hr_interview_date: iso(-30 * MIN),
    }),
    job: jobBase({ exam_start_date: iso(-7 * DAY), exam_end_date: iso(-6 * DAY) }),
    interviews: [
      technicalRecord('hr-live-tech-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-3 * DAY),
        slot_key: 'slot-technical-1',
        ...passedScorecard(4),
      }),
      hrRecord('hr-live-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-30 * MIN),
        status: 'ongoing',
        candidate_confirmed: true,
        attended_at: iso(-10 * MIN),
        slot_key: 'slot-hr-1',
      }),
    ],
    slots: [],
    offer: null,
  },
  {
    id: 'fresher-hr-failed',
    label: 'Fresher: HR Disqualified / Failed',
    description: 'Exam + Technical cleared (green); HR failed — red banner only inside Stage 3.',
    group: 'Outcome',
    candidate: fresherBase({
      status: 'rejected',
      exam_started_at: iso(-6 * DAY),
      exam_completed_at: iso(-6 * DAY + HOUR),
      exam_score: 34,
      exam_feedback: 'Outstanding assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Strong problem-solving and communication skills.',
      technical_interview_time: iso(-4 * DAY),
      technical_interview_date: iso(-4 * DAY),
      hr_interview_status: 'failed',
      hr_interview_feedback: 'Salary expectations mismatch.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-7 * DAY), exam_end_date: iso(-6 * DAY) }),
    interviews: [
      technicalRecord('hr-fail-tech-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-4 * DAY),
        slot_key: 'slot-technical-1',
        ...passedScorecard(4),
      }),
      hrRecord('hr-fail-1', fresherBase(), jobBase(), {
        scheduled_at: iso(-1 * DAY),
        slot_key: 'slot-hr-1',
        ...failedScorecard('Salary expectations did not align.'),
      }),
    ],
    slots: [],
    offer: null,
  },

  // ====================== OFFER & ONBOARDING ======================
  {
    id: 'fresher-all-cleared',
    label: 'Fresher: All Rounds Cleared (T&C Pending)',
    description: '3/3 cleared — Terms & Conditions CTA shown, no offer yet.',
    group: 'Offer & Onboarding',
    candidate: fresherBase({
      exam_started_at: iso(-6 * DAY),
      exam_completed_at: iso(-6 * DAY + HOUR),
      exam_score: 36,
      exam_feedback: 'Outstanding assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent across all metrics.',
      technical_interview_time: iso(-4 * DAY),
      technical_interview_date: iso(-4 * DAY),
      hr_interview_status: 'passed',
      hr_interview_feedback: 'Great culture fit and communication.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-7 * DAY), exam_end_date: iso(-6 * DAY) }),
    interviews: [
      technicalRecord('tech-all-1', fresherBase(), jobBase(), { scheduled_at: iso(-4 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(5) }),
      hrRecord('hr-all-1', fresherBase(), jobBase(), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...passedScorecard(5, 'Excellent culture fit.') }),
    ],
    slots: [],
    offer: null,
    terms_content_html: OFFER_TERMS_HTML,
    terms_checkbox_labels: OFFER_TERMS_LABELS,
  },
  {
    id: 'fresher-offer-ready',
    label: 'Fresher: Offer Ready — T&C Checklist',
    description: 'All rounds cleared + offer letter ready — T&C modal gates the offer letter.',
    group: 'Offer & Onboarding',
    candidate: fresherBase({
      candidate_id: 'CAND-FR-2026-004',
      name: 'Sneha Reddy',
      email: 'sneha.reddy@example.com',
      exam_started_at: iso(-6 * DAY),
      exam_completed_at: iso(-6 * DAY + HOUR),
      exam_score: 36,
      exam_feedback: 'Outstanding assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent across all metrics.',
      technical_interview_time: iso(-4 * DAY),
      technical_interview_date: iso(-4 * DAY),
      hr_interview_status: 'passed',
      hr_interview_feedback: 'Great culture fit and communication.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-7 * DAY), exam_end_date: iso(-6 * DAY) }),
    interviews: [
      technicalRecord('tech-offer-1', fresherBase(), jobBase(), { scheduled_at: iso(-4 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(5) }),
      hrRecord('hr-offer-1', fresherBase(), jobBase(), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...passedScorecard(5, 'Excellent culture fit.') }),
    ],
    slots: [],
    offer: buildOffer(fresherBase(), jobBase()),
  },
  {
    id: 'fresher-offer-accepted',
    label: 'Fresher: Offer Accepted — PDF Offer Letter View',
    description: 'Candidate accepted — full official offer letter PDF document shown.',
    group: 'Offer & Onboarding',
    candidate: fresherBase({
      status: 'hired',
      exam_started_at: iso(-6 * DAY),
      exam_completed_at: iso(-6 * DAY + HOUR),
      exam_score: 36,
      exam_feedback: 'Outstanding assessment.',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent across all metrics.',
      technical_interview_time: iso(-4 * DAY),
      technical_interview_date: iso(-4 * DAY),
      hr_interview_status: 'passed',
      hr_interview_feedback: 'Great culture fit and communication.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: jobBase({ exam_start_date: iso(-7 * DAY), exam_end_date: iso(-6 * DAY) }),
    interviews: [
      technicalRecord('tech-offer-2', fresherBase(), jobBase(), { scheduled_at: iso(-4 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(5) }),
      hrRecord('hr-offer-2', fresherBase(), jobBase(), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...passedScorecard(5, 'Excellent culture fit.') }),
    ],
    slots: [],
    offer: buildOffer(fresherBase(), jobBase(), { status: 'accepted', candidate_response: 'accept' }),
  },

  // ========================== EXPERIENCED ==========================
  {
    id: 'exp-fresh',
    label: 'Experienced — Tech Slots Open',
    description: '2-round pipeline; book the Technical slot directly.',
    group: 'Experienced',
    candidate: experiencedBase(),
    job: noExam(jobBase()),
    interviews: [],
    slots: [...publishedSlots('technical', [1, 2, 3]), ...publishedSlots('hr', [5, 6])],
    offer: null,
  },
  {
    id: 'exp-tech-booked',
    label: 'Experienced — Tech Booked',
    description: 'Confirmed technical slot in 4 hours.',
    group: 'Experienced',
    candidate: experiencedBase({ technical_interview_status: 'scheduled', technical_interview_date: iso(4 * HOUR), technical_interview_time: iso(4 * HOUR) }),
    job: noExam(jobBase()),
    interviews: [
      technicalRecord('exp-tech-booked-1', experiencedBase(), noExam(jobBase()), {
        scheduled_at: iso(4 * HOUR),
        status: 'scheduled',
        candidate_confirmed: true,
        slot_key: 'slot-technical-1',
      }),
    ],
    slots: [
      { id: 'slot-technical-1', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(4 * HOUR), status: 'open', max_candidates: 5, booked: 1 },
      { id: 'slot-technical-2', job_opening_id: 'job-opening-001', round: 'technical', scheduled_at: iso(2 * DAY), status: 'open', max_candidates: 5, booked: 0 },
    ],
    offer: null,
  },
  {
    id: 'exp-tech-passed',
    label: 'Experienced — Tech Passed, HR Open',
    description: '1/2 cleared — HR slots open.',
    group: 'Experienced',
    candidate: experiencedBase({
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent domain expertise.',
      technical_interview_time: iso(-1 * DAY),
      technical_interview_date: iso(-1 * DAY),
    }),
    job: noExam(jobBase()),
    interviews: [
      technicalRecord('exp-tech-passed-1', experiencedBase(), noExam(jobBase()), {
        scheduled_at: iso(-1 * DAY),
        slot_key: 'slot-technical-1',
        ...passedScorecard(4, 'Excellent domain expertise.'),
      }),
    ],
    slots: [...publishedSlots('hr', [2, 3])],
    offer: null,
  },
  {
    id: 'exp-offer-ready',
    label: 'Experienced: Offer Ready — T&C Checklist',
    description: '2/2 cleared + offer — T&C modal gates the offer letter.',
    group: 'Offer & Onboarding',
    candidate: experiencedBase({
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent domain expertise.',
      technical_interview_time: iso(-2 * DAY),
      technical_interview_date: iso(-2 * DAY),
      hr_interview_status: 'passed',
      hr_interview_feedback: 'Strong senior-level communication.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: noExam(jobBase({ title: 'Senior Software Engineer' })),
    interviews: [
      technicalRecord('exp-tech-offer-1', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-2 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(5) }),
      hrRecord('exp-hr-offer-1', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...passedScorecard(5, 'Great fit for the senior role.') }),
    ],
    slots: [],
    offer: buildOffer(experiencedBase(), noExam(jobBase()), { salary_offered: 1400000, salary_breakdown: { base_salary: 1050000, variable: 140000, allowances: 210000, gross_total: 1400000 }, service_bond_years: 1 }),
  },
  {
    id: 'exp-offer-discussed',
    label: 'Experienced — Offer Discussed',
    description: 'Discuss Offer response recorded.',
    group: 'Offer & Onboarding',
    candidate: experiencedBase({
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent domain expertise.',
      technical_interview_time: iso(-2 * DAY),
      technical_interview_date: iso(-2 * DAY),
      hr_interview_status: 'passed',
      hr_interview_feedback: 'Strong senior-level communication.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: noExam(jobBase({ title: 'Senior Software Engineer' })),
    interviews: [
      technicalRecord('exp-tech-offer-2', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-2 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(5) }),
      hrRecord('exp-hr-offer-2', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...passedScorecard(5, 'Great fit for the senior role.') }),
    ],
    slots: [],
    offer: buildOffer(experiencedBase(), noExam(jobBase()), { salary_offered: 1400000, salary_breakdown: { base_salary: 1050000, variable: 140000, allowances: 210000, gross_total: 1400000 }, service_bond_years: 1, candidate_response: 'discuss' }),
  },
  {
    id: 'exp-hr-failed',
    label: 'Experienced — HR Not Cleared',
    description: 'Pipeline stopped at HR with scorecard verdict.',
    group: 'Outcome',
    candidate: experiencedBase({
      status: 'rejected',
      technical_interview_status: 'passed',
      technical_interview_feedback: 'Excellent domain expertise.',
      technical_interview_time: iso(-2 * DAY),
      technical_interview_date: iso(-2 * DAY),
      hr_interview_status: 'failed',
      hr_interview_feedback: 'Salary expectations mismatch.',
      hr_interview_time: iso(-1 * DAY),
      hr_interview_date: iso(-1 * DAY),
    }),
    job: noExam(jobBase()),
    interviews: [
      technicalRecord('exp-tech-fail-1', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-2 * DAY), slot_key: 'slot-technical-1', ...passedScorecard(4) }),
      hrRecord('exp-hr-fail-1', experiencedBase(), noExam(jobBase()), { scheduled_at: iso(-1 * DAY), slot_key: 'slot-hr-1', ...failedScorecard('Salary expectations did not align.') }),
    ],
    slots: [],
    offer: null,
  },

  // ========================== DISQUALIFIED ==========================
  {
    id: 'fresher-dq-exam',
    label: 'Load Disqualified Candidate',
    description: 'Malpractice / AI-tool violation at the exam stage — pipeline frozen.',
    group: 'Outcome',
    candidate: fresherBase({
      candidate_id: 'CAND-DQ-2026-003',
      name: 'Karan Mehta',
      email: 'karan.mehta@example.com',
      status: 'rejected',
      malpractice_flag: true,
      cheating_detected: true,
      disqualified_at: iso(-1 * HOUR),
      disqualified_reason: 'Malpractice / AI tool violation detected during the assessment.',
      exam_started_at: iso(-2 * HOUR),
    }),
    job: jobBase({ exam_start_date: iso(-3 * HOUR), exam_end_date: iso(2 * HOUR) }),
    interviews: [],
    slots: [...publishedSlots('technical', [2, 3, 4]), ...publishedSlots('hr', [6, 7])],
    offer: null,
  },
  {
    id: 'fresher-dq-tech',
    label: 'Fresher: Tech Disqualified / Failed',
    description: 'Stage 1 stays GREEN (cleared); Stage 2 shows RED Disqualified; Stage 3 stays LOCKED.',
    group: 'Outcome',
    candidate: fresherBase({
      status: 'rejected',
      exam_started_at: iso(-5 * DAY),
      exam_completed_at: iso(-5 * DAY + HOUR),
      exam_score: 33,
      exam_feedback: 'Solid fundamentals. Cleared the assessment.',
      disqualified_at: iso(-1 * DAY),
      disqualified_reason: 'You did not select an interview slot within the scheduled windows.',
    }),
    job: jobBase({ exam_start_date: iso(-6 * DAY), exam_end_date: iso(-5 * DAY) }),
    interviews: [],
    slots: [...publishedSlots('technical', [-3, -2])],
    offer: null,
  },
  {
    id: 'exp-dq',
    label: 'Experienced — Disqualified (No Slot Selected)',
    description: 'All technical slots elapsed without a booking.',
    group: 'Outcome',
    candidate: experiencedBase({
      status: 'rejected',
      disqualified_at: iso(-1 * DAY),
      disqualified_reason: 'All Technical interview slots have elapsed and no slot was selected.',
    }),
    job: noExam(jobBase()),
    interviews: [],
    slots: [...publishedSlots('technical', [-3, -2])],
    offer: null,
  },
]

// Default scenario loaded on demo login — an all-rounds-cleared candidate so
// the portal opens on the Offer stage (T&C modal → offer letter).
export const DEFAULT_SCENARIO: PortalSnapshot =
  MOCK_SCENARIOS.find((s) => s.id === 'fresher-offer-ready') ?? MOCK_SCENARIOS[0]

// ---------------------------------------------------------------------------
// Candidate profiles — the four demo identities exposed by the login screen's
// "Candidate Profile / Journey Selector". Each profile maps to one snapshot
// so a selection (or a matching Candidate ID) loads the exact journey.
// ---------------------------------------------------------------------------

export interface CandidateProfile {
  id: string
  label: string
  candidate_id: string
  scenarioId: string
  description: string
}

export const CANDIDATE_PROFILES: CandidateProfile[] = [
  {
    id: 'profile-fresher-exam',
    label: 'Candidate 1 · Fresher — Exam Scheduled',
    candidate_id: 'CAND-FR-2026-001',
    scenarioId: 'fresher-fresh',
    description: 'Stage 1 Online Exam scheduled — exam overview, metadata grid & proctoring rules.',
  },
  {
    id: 'profile-exp-tech',
    label: 'Candidate 2 · Experienced — Tech Round Slot Booking',
    candidate_id: 'CAND-EX-2026-014',
    scenarioId: 'exp-fresh',
    description: '2-round pipeline — Technical interview slot pickers are open.',
  },
  {
    id: 'profile-dq-exam',
    label: 'Candidate 3 · Disqualified — Malpractice Detected',
    candidate_id: 'CAND-DQ-2026-003',
    scenarioId: 'fresher-dq-exam',
    description: 'Isolated red failure banner — pipeline frozen at Stage 1.',
  },
  {
    id: 'profile-offer-ready',
    label: 'Candidate 4 · All Stages Cleared — Offer Letter',
    candidate_id: 'CAND-FR-2026-004',
    scenarioId: 'fresher-offer-ready',
    description: 'All rounds cleared — Terms & Conditions modal unlocks the PDF offer letter.',
  },
]

export function getScenarioById(id: string): PortalSnapshot | null {
  return MOCK_SCENARIOS.find((s) => s.id === id) ?? null
}

// ---------------------------------------------------------------------------
// Offer factory — synthesized offer record when the snapshot has none but all
// required rounds are cleared.
// ---------------------------------------------------------------------------

export function buildMockOffer(candidate: MockCandidate, job: MockJobOpening, overrides: Partial<MockOffer> = {}): MockOffer {
  const now = new Date().toISOString()
  return {
    id: 'mock-offer',
    candidate_id: candidate.id,
    job_opening_id: job.id,
    pdf_url: OFFER_PDF_URL,
    document_title: 'Offer of Employment',
    terms_content_html: OFFER_TERMS_HTML,
    terms_checkbox_labels: OFFER_TERMS_LABELS,
    salary_offered: 600000,
    joining_date: new Date(Date.now() + 30 * DAY).toISOString(),
    service_bond_years: 2,
    relocation_required: false,
    relocation_location: null,
    salary_breakdown: { base_salary: 450000, variable: 60000, allowances: 90000, gross_total: 600000 },
    status: 'sent',
    candidate_response: null,
    created_at: now,
    ...overrides,
  }
}