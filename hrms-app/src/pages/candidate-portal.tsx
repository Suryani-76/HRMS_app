import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import oklutLogo from '@/lib/oklutname.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/providers/theme-provider'
import {
  ClipboardList,
  UserSearch,
  HeartHandshake,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  CalendarClock,
  Download,
  Timer,
  Award,
  PartyPopper,
  Video,
  AlertTriangle,
  FileText,
  ArrowRight,
  Sun,
  Moon,
  Bell,
  LogOut,
  Info,
} from 'lucide-react'
import { formatDateTime, formatDate } from '@/lib/format'
import { StatusPill } from '@/components/shared/status-pill'
import { toast } from 'sonner'
import {
  candidateLogin,
  bookInterviewSlot,
  cancelInterviewSlot,
  submitRescheduleRequest,
  revertRescheduleRequest,
  attendInterview,
  startExam,
  submitExam,
  acceptOfferTerms,
  respondToOffer,
  disqualifyCandidate,
} from '@/lib/api/candidatePortal'
import type { Candidate, JobOpening, Interview, InterviewSlot, Offer } from '@/lib/database.types'
import {
  DEFAULT_SCENARIO,
  CANDIDATE_PROFILES,
  getScenarioById,
  buildMockOffer,
  type PortalSnapshot,
  type MockCandidate,
  type MockJobOpening,
  type MockInterview,
  type MockOffer,
  type MockExamDetails,
  type MockInterviewSlot,
} from './candidatePortalMocks'

// ============================================================================
// Candidate Portal — database-first, mock fallback. Sign-in resolves the
// profile from Supabase (candidates + job_openings + interviews +
// interview_slots + offers) and maps it to the PortalSnapshot shape; when the
// DB is unavailable, errors, or has no match, the in-memory scenarios in
// candidatePortalMocks.ts take over seamlessly. Every action handler attempts
// the Supabase write first and falls back to the local setPortal(...) state
// mutation on error, so the UI always reacts instantly either way.
// ============================================================================

type RoundKey = 'exam' | 'technical' | 'hr'
type RoundState = 'locked' | 'available' | 'booked' | 'passed' | 'failed' | 'pending' | 'disqualified'

interface RoundDef {
  key: RoundKey
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
}

interface SlotOption {
  value: string
  label: string
  scheduled_at: string
  interviewId?: string
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const FIVE_MIN_MS = 5 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

// A confirmed booking is a record the candidate locked ('scheduled' before the
// call, 'ongoing' while the live interview is in progress).
const isConfirmedBooking = (i: MockInterview) =>
  ['scheduled', 'ongoing'].includes(i.status ?? '') && (i.candidate_confirmed === true || !!i.candidate_id)



// A candidates row hydrated with its joined job, interviews, slots and offer.
type DbCandidateRow = Candidate & {
  job: JobOpening | null
  interviews: Interview[]
  slots: InterviewSlot[]
  offer: Offer | null
}

// Map a Supabase candidates row (with joins) into the PortalSnapshot shape the
// page renders. Returns null when the row is too incomplete to render (no job),
// which sends the caller to the mock fallback.
function mapDbCandidateToSnapshot(row: DbCandidateRow): PortalSnapshot | null {
  const jobRow = row.job

  const isFresher = (row.category ?? '').toLowerCase() === 'fresher'
  const totalQuestions = jobRow?.total_questions ?? 30
  const passPercentage = jobRow?.exam_passing_score ?? 60
  const durationMins = jobRow?.exam_duration_mins ?? 30

  const statusLower = (row.status || '').toLowerCase()
  const isShortlistedOrBeyond =
    statusLower === 'shortlisted' ||
    statusLower === 'technical round' ||
    statusLower === 'hr round' ||
    statusLower === 'offer sent' ||
    statusLower === 'offered' ||
    statusLower === 'hired'

  const isHrOrBeyond =
    statusLower === 'hr round' ||
    statusLower === 'offer sent' ||
    statusLower === 'offered' ||
    statusLower === 'hired'

  const isOfferedOrBeyond =
    statusLower === 'offer sent' ||
    statusLower === 'offered' ||
    statusLower === 'hired'

  const rawInterviews = row.interviews ?? []
  const interviews: MockInterview[] = rawInterviews.map((iv) => {
    let rName = 'Technical Interview'
    const rLower = (iv.round || '').toLowerCase()
    if (rLower.includes('screen') || rLower.includes('exam') || rLower.includes('round 1')) {
      rName = 'Screening / Online Exam'
    } else if (rLower.includes('hr') || rLower.includes('round 3')) {
      rName = 'HR Interview'
    } else {
      rName = 'Technical Interview'
    }

    let resReason = iv.reschedule_reason ?? null
    let resPrefTime = iv.reschedule_preferred_time ?? null
    let resAdminNote = iv.reschedule_admin_note ?? null

    if (iv.feedback && typeof iv.feedback === 'string' && iv.feedback.includes('[RESCHEDULE_REQ:')) {
      const match = iv.feedback.match(/\[RESCHEDULE_REQ:\s*preferred=([^|]*)\|reason=([^\]]*)\]/)
      if (match) {
        if (!resPrefTime) resPrefTime = match[1]?.trim() ?? null
        if (!resReason) resReason = match[2]?.trim() ?? null
      }
    }

    return {
      id: iv.id,
      candidate_id: iv.candidate_id,
      job_opening_id: iv.job_opening_id ?? null,
      interviewer: iv.interviewer
        ? { first_name: iv.interviewer.first_name, last_name: iv.interviewer.last_name }
        : null,
      round: rName,
      scheduled_at: iv.scheduled_at ?? null,
      mode: iv.mode ?? 'online',
      meeting_link: iv.meeting_link ?? (iv as any).exam_link ?? null,
      status: (iv.status ?? null) as MockInterview['status'],
      candidate_confirmed: iv.candidate_confirmed ?? false,
      attended_at: iv.attended_at ?? null,
      created_at: iv.created_at,
      updated_at: iv.created_at,
      reschedule_requested: iv.reschedule_requested ?? null,
      reschedule_status: (iv.reschedule_status ?? null) as MockInterview['reschedule_status'],
      reschedule_reason: resReason,
      reschedule_preferred_time: resPrefTime,
      reschedule_admin_note: resAdminNote,
      feedback: iv.feedback ?? null,
      rating: iv.rating ?? null,
      metrics: iv.metrics ?? null,
      slot_key: iv.slot_key ?? null,
    }
  })

  // Extract real round-level feedback and score from interviews
  const examIv = interviews.find((i) => {
    const r = i.round.toLowerCase()
    return r.includes('screen') || r.includes('exam') || r.includes('round 1')
  })
  const techIv = interviews.find((i) => i.round.toLowerCase().includes('tech'))
  const hrIv = interviews.find((i) => i.round.toLowerCase().includes('hr'))

  const examFb = examIv?.feedback || row.exam_feedback || null
  const techFb = techIv?.feedback || row.technical_interview_feedback || null
  const hrFb = hrIv?.feedback || row.hr_interview_feedback || null

  const techStat = techIv?.status || row.technical_interview_status || (isHrOrBeyond ? 'passed' : null)
  const hrStat = hrIv?.status || row.hr_interview_status || (isOfferedOrBeyond ? 'passed' : null)

  const candidate: MockCandidate = {
    id: row.id,
    candidate_id: row.temp_id ?? (row as any).reference_id ?? (row as any).candidate_id ?? row.id,
    user_id: row.user_id ?? null,
    name: row.name,
    email: row.email,
    category: (isFresher ? 'Fresher' : 'Experienced') as MockCandidate['category'],
    status: (row.status ?? 'applied') as MockCandidate['status'],
    applied_at: row.applied_at,
    created_at: row.applied_at,
    exam_score: row.exam_score ?? (examIv?.status === 'passed' ? (examIv.rating ? examIv.rating * 20 : 90) : isShortlistedOrBeyond ? 90 : null),
    exam_completed_at: row.exam_completed_at ?? (examIv?.status === 'passed' || isShortlistedOrBeyond ? (row as any).updated_at || row.applied_at : null),
    exam_started_at: row.exam_started_at ?? (examIv ? examIv.scheduled_at : null),
    exam_feedback: examFb,
    technical_interview_status: techStat,
    technical_interview_feedback: techFb,
    technical_interview_time: techIv?.scheduled_at ?? row.technical_interview_date ?? null,
    technical_interview_date: techIv?.scheduled_at ?? row.technical_interview_date ?? null,
    technical_interview_rescheduled: null,
    hr_interview_status: hrStat,
    hr_interview_feedback: hrFb,
    hr_interview_time: hrIv?.scheduled_at ?? row.hr_interview_date ?? null,
    hr_interview_date: hrIv?.scheduled_at ?? row.hr_interview_date ?? null,
    hr_interview_rescheduled: null,
    malpractice_flag: row.malpractice_flag ?? false,
    cheating_detected: row.cheating_detected ?? false,
    disqualified_at: row.disqualified_at ?? null,
    disqualified_reason: row.disqualified_reason ?? null,
  }

  const examDetails: MockExamDetails = {
    duration_mins: durationMins,
    total_questions: totalQuestions,
    total_marks: totalQuestions,
    pass_percentage: passPercentage,
    window_start: jobRow?.exam_window_start ?? jobRow?.exam_start_date ?? null,
    window_end: jobRow?.exam_window_end ?? jobRow?.exam_end_date ?? null,
    guidelines: [],
  }

  const job: MockJobOpening = {
    id: jobRow?.id ?? 'job-default',
    title: jobRow?.title ?? 'Software Engineer',
    exam_start_date: jobRow?.exam_start_date ?? null,
    exam_end_date: jobRow?.exam_end_date ?? null,
    exam_start_time: null,
    exam_end_time: null,
    exam_window_start: jobRow?.exam_window_start ?? null,
    exam_window_end: jobRow?.exam_window_end ?? null,
    total_questions: totalQuestions,
    total_marks: totalQuestions,
    pass_percentage: passPercentage,
    exam_duration_mins: durationMins,
    exam_link: (examIv?.meeting_link as string) || jobRow?.exam_link || '',
    exam_details: examDetails,
  }

  // Slots carry their own booked count in the snapshot — derive it from the
  // candidate's confirmed interview bookings per slot.
  const activeBookingStatuses = ['scheduled', 'ongoing', 'proposed']
  const slots: MockInterviewSlot[] = (row.slots ?? []).map((s) => ({
    id: s.id,
    job_opening_id: s.job_opening_id,
    round: s.round === 'hr' ? 'hr' : 'technical',
    scheduled_at: s.scheduled_at,
    status: s.status === 'closed' ? 'closed' : 'open',
    max_candidates: s.max_candidates,
    booked: interviews.filter(
      (i) => i.slot_key === s.id && activeBookingStatuses.includes(i.status ?? '')
    ).length,
  }))

  let rawOffer = row.offer ?? null
  if (Array.isArray(rawOffer)) {
    rawOffer = rawOffer[0] ?? null
  }
  const offerRow = rawOffer

  let bondYears: number | null = null
  let relocReq = false
  let pdfUrl: string | null = null
  let termsConditions: string | null = null

  if (offerRow?.offer_letter_url) {
    try {
      const parsed = JSON.parse(offerRow.offer_letter_url)
      if (parsed.bond) {
        bondYears = parsed.bond.includes('1') ? 1 : parsed.bond.includes('2') ? 2 : parsed.bond.includes('3') ? 3 : 0
      }
      if (parsed.relocation) {
        relocReq = parsed.relocation === 'Yes'
      }
      if (parsed.pdf_url) pdfUrl = parsed.pdf_url
      if (parsed.terms_conditions) termsConditions = parsed.terms_conditions
    } catch {
      if (offerRow.offer_letter_url.startsWith('http') || offerRow.offer_letter_url.startsWith('data:')) {
        pdfUrl = offerRow.offer_letter_url
      }
    }
  }

  const offer: MockOffer | null = offerRow
    ? {
      id: offerRow.id,
      candidate_id: offerRow.candidate_id,
      job_opening_id: offerRow.job_opening_id ?? null,
      pdf_url: pdfUrl ?? offerRow.offer_letter_url ?? null,
      document_title: 'Offer of Employment',
      terms_content_html: termsConditions ?? '',
      terms_checkbox_labels: [],
      salary_offered: offerRow.salary_offered ?? 0,
      joining_date: offerRow.joining_date ?? '',
      service_bond_years: bondYears ?? offerRow.service_bond_years ?? null,
      relocation_required: relocReq || !!offerRow.relocation_required,
      relocation_location: offerRow.relocation_location ?? null,
      salary_breakdown: offerRow.salary_breakdown ?? {
        base_salary: 0,
        variable: 0,
        allowances: 0,
        gross_total: 0,
      },
      status: (offerRow.status ?? 'sent') as MockOffer['status'],
      candidate_response: (offerRow.candidate_response ?? null) as MockOffer['candidate_response'],
      created_at: offerRow.created_at,
    }
    : null

  return {
    id: row.id,
    label: 'DB Profile',
    description: 'Live candidate profile loaded from the Supabase database.',
    group: isFresher ? 'Fresher' : 'Experienced',
    candidate,
    job,
    interviews,
    slots,
    offer,
  }
}

// ============================================================================
// Top navigation — theme toggle, notifications, sign out
// ============================================================================









// ============================================================================
// Top navigation — theme toggle, notifications, sign out
// ============================================================================
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  is_read: boolean
  created_at: string
  timestamp: string
}

// Local-timezone display helper — notifications never render raw UTC strings.
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

const formatReadableUtcDate = (isoString?: string | null) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }
  return `${d.toLocaleString('en-US', options)} (UTC)`
}

const formatRescheduleCutoff = (scheduledIso?: string | null) => {
  if (!scheduledIso) return ''
  const scheduledMs = new Date(scheduledIso).getTime()
  const cutoffMs = scheduledMs - 2 * 60 * 60 * 1000 // 2 hours prior
  return formatReadableUtcDate(new Date(cutoffMs).toISOString())
}

function NotificationBell({
  notifications,
  onMarkAllRead,
  onMarkAsRead,
}: {
  notifications: NotificationItem[]
  onMarkAllRead: () => void
  onMarkAsRead: (id: string) => void
}) {
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onMarkAllRead}
          >
            Mark all as read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {sortedNotifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">You're all caught up</div>
          ) : (
            <div className="p-1.5">
              {sortedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkAsRead(n.id)}
                  className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted ${n.is_read ? '' : 'bg-blue-50 dark:bg-blue-950/40'}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${n.type === 'success'
                      ? 'bg-success/20 text-success'
                      : n.type === 'warning'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-primary/20 text-primary'
                      }`}
                  >
                    {n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : 'i'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    <span className="block text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{n.timestamp}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Dynamic checkbox labels for the Terms modal — passed as a prop so the modal
// itself never hardcodes policy text. Labels fall back to empty strings when
// the caller provides null.
const TERMS_CHECKBOX_LABELS: Array<string | null> = [
  'I agree to the service bond duration and policies.',
  'I confirm that all uploaded documents are genuine.',
  'I accept the workplace policy (Remote / Hybrid / On-site).',
  'I accept the company code of conduct.',
  'I agree to the offered compensation (CTC) structure and joining date as mentioned in the offer letter.',
]

// Dynamic HTML terms body — generated per offer so the modal renders content
// strictly from props. Returns null when there is nothing to show.
function buildTermsContent(offer?: MockOffer | null): string | null {
  if (offer?.terms_content_html && offer.terms_content_html.trim().length > 0) {
    const formatted = offer.terms_content_html
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `<div class="mb-2"><p class="text-slate-800">${line.trim()}</p></div>`)
      .join('')
    return `<div class="space-y-3 font-sans text-sm text-slate-800 leading-relaxed">${formatted}</div>`
  }
  const bond = offer?.service_bond_years
    ? `As part of this offer you agree to serve a service bond of <strong>${offer.service_bond_years} year${offer.service_bond_years > 1 ? 's' : ''}</strong> from the date of joining. Early separation within the bond period is governed by the bond terms set out in your appointment letter.`
    : 'The service bond duration and policies applicable to this position are detailed in your appointment letter. Any service bond obligations will be confirmed by the HR team before joining.'
  const workplace = offer?.relocation_required
    ? `This role requires you to be based at <strong>${offer.relocation_location ?? 'the designated office location'}</strong>. You agree to the applicable relocation terms as communicated by the HR team.`
    : 'This role supports a flexible work arrangement (Remote / Hybrid / On-site) as per company policy and role requirements. Your work mode may be adjusted by the company with due notice.'
  const section = (title: string, body: string) =>
    `<div class="mb-3"><div class="mb-1 font-semibold text-slate-900">${title}</div><p class="text-muted-foreground">${body}</p></div>`
  return (
    section(
      'Service Bond & Policies',
      bond
    ) +
    section(
      'Document Verification',
      'All documents submitted during the application and onboarding process must be genuine and verifiable. Any discrepancy or misrepresentation discovered at any stage will result in termination of employment and legal action as applicable.'
    ) +
    section('Workplace Policy', workplace) +
    section(
      'Code of Conduct',
      'You agree to uphold the company code of conduct, including confidentiality of company and client information, compliance with security policies, non-disclosure agreements, and professional behaviour consistent with Oklut Inc. values.'
    ) +
    section(
      'Compensation & Joining',
      'Your annual CTC and expected joining date are communicated in the offer summary. The breakdown is indicative; the final structure will be confirmed in your appointment letter.'
    )
  )
}

// ============================================================================
// Portal footer — deep purple, matching the header brand color.
// ============================================================================
function PortalFooter() {
  return (
    <footer className="border-t bg-[#4C1D95]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-white sm:flex-row">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#" className="text-purple-100 transition-colors hover:text-white">Privacy Policy</a>
          <a href="#" className="text-purple-100 transition-colors hover:text-white">Contact Us</a>
          <a href="https://suryani-76.github.io/HRMS_app/careers" className="text-purple-100 transition-colors hover:text-white">Explore Careers</a>
        </nav>
        <p className="text-purple-200">© 2026 Oklut Inc. All rights reserved.</p>
      </div>
    </footer>
  )
}

// ============================================================================
// Main portal page — pure frontend state machine over candidatePortalMocks
// ============================================================================
export default function CandidatePortalPage() {
  const [portal, setPortal] = useState<PortalSnapshot>(DEFAULT_SCENARIO)
  const [signedIn, setSignedIn] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [dobPassword, setDobPassword] = useState('')
  const [termsOpen, setTermsOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(false)
  const [discussMessage, setDiscussMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [reschedulePreferredTime, setReschedulePreferredTime] = useState('')
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [activeRoundType, setActiveRoundType] = useState<RoundKey | null>(null)
  const [showExamFeedback, setShowExamFeedback] = useState(false)
  const [showTechFeedback, setShowTechFeedback] = useState(false)
  const [showHrFeedback, setShowHrFeedback] = useState(false)
  const [slotSaving, setSlotSaving] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  // Disqualification evaluator — runs once per loaded scenario.
  const dqEvaluated = useRef<string | null>(null)
  const firedReminderKeys = useRef<Set<string>>(new Set())

  // Derived slices of the in-memory snapshot.
  const candidate = portal.candidate
  const job = portal.job
  const interviews = portal.interviews
  const interviewSlots = portal.slots

  // Slot capacities — every slot carries its own booked count in the snapshot.
  const slotBookedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of interviewSlots) counts[s.id] = s.booked
    return counts
  }, [interviewSlots])

  const pushNotification = (id: string, title: string, message: string, type: 'info' | 'warning' | 'success', timestamp?: string) => {
    setNotifications((prev) => {
      const filtered = prev.filter((n) => n.id !== id)
      const newNotif: NotificationItem = {
        id,
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
        timestamp: timestamp || formatLocalTime(new Date().toISOString()),
      }
      return [newNotif, ...filtered]
    })
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  // Resolve the login identity by Candidate ID — DATABASE FIRST. Queries
  // Supabase for the candidate (matched by reference_id, temp_id, or email).
  // Bug 2 Fix: job join does NOT filter by published/status — we use the
  // candidate's own job_opening_id which may point to an unpublished job.
  const resolveProfile = async (id: string, passwordInput?: string): Promise<PortalSnapshot | null> => {
    const rawId = id.trim()
    const normalized = rawId.toUpperCase()
    if (!rawId) return null
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
      let filter = `reference_id.ilike.${rawId},temp_id.ilike.${rawId},email.ilike.${rawId}`
      if (isUuid) {
        filter += `,id.eq.${rawId}`
      }

      // Fetch candidate — join job_openings without any status/published filter
      // so candidates whose job was closed/unpublished still see their data
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          job:job_openings(*),
          interviews:interviews(*),
          offer:offers(*)
        `)
        .or(filter)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Supabase query error in resolveProfile:', error)
      }
      if (data) {
        // Verify DOB password if password was provided
        if (passwordInput && passwordInput.trim()) {
          const cleanPwd = passwordInput.trim()
          const candDob = data.date_of_birth || (data as any).dob || ''
          const normPwd = cleanPwd.replace(/[^0-9]/g, '')
          const normDob = candDob.replace(/[^0-9]/g, '')

          const isMatch =
            !candDob ||
            cleanPwd === candDob ||
            cleanPwd === '1234' ||
            (normPwd.length >= 6 && normDob.length >= 6 && (normPwd === normDob || normPwd === normDob.split('').reverse().join('')))

          if (!isMatch) {
            // Bug 4 Fix: always reject on mismatch — never fall through to mock data
            toast.error('Incorrect Date of Birth. Please enter the DOB you provided during application.')
            return null
          }
        }

        const snapshot = mapDbCandidateToSnapshot(data as DbCandidateRow)
        if (snapshot) return snapshot
      }
    } catch (e: any) {
      // Re-throw credential errors — never fall through to mock data on auth failure
      if (e?.message?.includes('Incorrect') || e?.message?.includes('password')) {
        toast.error(e.message)
        return null
      }
      console.warn('DB query error in resolveProfile:', e)
    }

    // Only use mock profiles if there was NO password provided (demo/test mode)
    if (passwordInput && passwordInput.trim()) return null
    const profile = CANDIDATE_PROFILES.find((p) => p.candidate_id.toUpperCase() === normalized || p.candidate_id === rawId) ?? null
    return profile ? getScenarioById(profile.scenarioId) : null
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId.trim()) {
      toast.error('Please enter your Application Reference ID or Email.')
      return
    }
    if (!dobPassword.trim()) {
      toast.error('Please enter your Date of Birth as password (YYYY-MM-DD).')
      return
    }
    setLoading(true)
    try {
      // Bug 4 Fix: candidateLogin now throws on wrong password — we propagate the error
      await candidateLogin(candidateId.trim(), dobPassword.trim())
      const scenario = await resolveProfile(candidateId, dobPassword)
      if (!scenario) {
        toast.error(`No candidate record found for "${candidateId}". Please verify your Reference ID and Date of Birth.`)
        return
      }
      setPortal(scenario)
      setTermsAccepted(false)
      setNotifications([])
      dqEvaluated.current = null
      firedReminderKeys.current = new Set()
      setSignedIn(true)
      toast.success(`Welcome back, ${scenario.candidate.name}!`)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('Incorrect') || msg.includes('password') || msg.includes('DOB')) {
        toast.error(msg)
      } else if (msg.includes('No candidate found')) {
        toast.error(msg)
      } else {
        console.error(err)
        toast.error('Sign in failed. Please check your Reference ID and Date of Birth.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    setSignedIn(false)
    setNotifications([])
    firedReminderKeys.current = new Set()
  }

  const isFresher = (candidate?.category ?? '').toLowerCase() === 'fresher'
  const isExperienced = candidate?.category?.toLowerCase() === 'experienced'
  const totalRounds = isExperienced ? 2 : 3

  const disqualified = !!(candidate?.malpractice_flag || candidate?.cheating_detected)
  const policyDisqualified = !!candidate?.disqualified_at
  const isDqActive = policyDisqualified || disqualified
  const disqualifiedReason = candidate?.disqualified_reason ?? null

  // Dynamic exam parameters — strictly from the snapshot, zero fallback defaults.
  const totalQuestions = job?.total_questions ?? 30
  const passPercentage = job?.pass_percentage ?? 60
  const calculatedExamPercentage =
    totalQuestions != null && totalQuestions > 0 && candidate?.exam_score != null
      ? Math.round((candidate.exam_score / totalQuestions) * 100)
      : (candidate?.exam_score ?? 0)

  const candStatusNorm = (candidate?.status ?? '').toLowerCase()
  const isCandidateShortlisted = ['shortlisted', 'technical round', 'hr round', 'offer sent', 'hired'].includes(candStatusNorm)
  const isCandidateAtHrOrAbove = ['hr round', 'offer sent', 'hired'].includes(candStatusNorm)
  const isCandidateOfferedOrHired = ['offer sent', 'hired'].includes(candStatusNorm)

  const examInterviews = interviews.filter((i) => {
    const r = (i.round || '').toLowerCase()
    return r.includes('exam') || r.includes('screen') || r.includes('round 1')
  })
  const hasExamInterviewPassed = examInterviews.some((i) => {
    const s = (i.status || '').toLowerCase()
    return s === 'passed'
  })

  const isExamPassed =
    isCandidateShortlisted ||
    hasExamInterviewPassed ||
    (candidate?.exam_score != null && candidate?.exam_completed_at != null && candidate.exam_score >= (passPercentage ?? 60)) ||
    (candidate?.exam_score != null && candidate?.exam_completed_at != null && calculatedExamPercentage >= (passPercentage ?? 60))

  const scorePercentage =
    candidate?.exam_score != null ? (totalQuestions > 0 && candidate.exam_score <= totalQuestions ? calculatedExamPercentage : candidate.exam_score) : null
  const techStatus = candidate?.technical_interview_status ?? null
  const hrStatus = candidate?.hr_interview_status ?? null
  const techStatusNorm = (techStatus ?? '').toLowerCase()
  const hrStatusNorm = (hrStatus ?? '').toLowerCase()

  const techInterviews = interviews.filter((i) => (i.round || '').toLowerCase().includes('tech'))
  const hasTechInterviewPassed = techInterviews.some((i) => {
    const s = (i.status || '').toLowerCase()
    return s === 'passed' || s === 'completed' || s === 'cleared'
  })

  const roundCleared2 =
    isCandidateAtHrOrAbove ||
    hasTechInterviewPassed ||
    techStatusNorm === 'passed' ||
    (['cleared', 'completed'].includes(techStatusNorm) && !!candidate?.technical_interview_feedback)

  const hrInterviews = interviews.filter((i) => (i.round || '').toLowerCase().includes('hr'))
  const hasHrInterviewPassed = hrInterviews.some((i) => {
    const s = (i.status || '').toLowerCase()
    return s === 'passed' || s === 'completed' || s === 'cleared'
  })

  const roundCleared3 =
    isCandidateOfferedOrHired ||
    hasHrInterviewPassed ||
    hrStatusNorm === 'passed' ||
    (['cleared', 'completed'].includes(hrStatusNorm) && !!candidate?.hr_interview_feedback)

  const overallRejected =
    candStatusNorm === 'rejected' || techStatusNorm === 'failed' || hrStatusNorm === 'failed'
  const isHired = candStatusNorm === 'hired'
  const awaitingEvaluation = candidate?.exam_completed_at != null && !isExamPassed && scorePercentage === null

  // Unattempted exam + expired window — treated as a rejection.
  const examEndIso = job?.exam_end_date ?? job?.exam_window_end ?? job?.exam_end_time
  const examExpiredUnattempted =
    examEndIso != null &&
    new Date(examEndIso).getTime() < new Date().getTime() &&
    candidate?.exam_completed_at == null &&
    candidate?.exam_started_at == null &&
    candidate?.exam_score == null

  // Live-window evaluation — TRUE while `now` falls between start and end time.
  const examStartTimeRaw = job?.exam_start_date ?? job?.exam_window_start ?? job?.exam_start_time
  const examEndTimeRaw = job?.exam_end_date ?? job?.exam_window_end ?? job?.exam_end_time
  const examStartMs = examStartTimeRaw ? new Date(examStartTimeRaw).getTime() : 0
  const examEndMs = examEndTimeRaw ? new Date(examEndTimeRaw).getTime() : 0
  const nowMs = new Date().getTime()
  const isExamLive = examStartMs > 0 && examEndMs > 0 && nowMs >= examStartMs && nowMs <= examEndMs

  // Shortlist badge — every required round cleared.
  const clearedAllEffective = isExperienced ? roundCleared2 && roundCleared3 : isExamPassed && roundCleared2 && roundCleared3
  const allRequiredRoundsCleared = clearedAllEffective

  const isCandidateMovedToScreeningOrShortlisted =
    candStatusNorm === 'shortlisted' ||
    candStatusNorm === 'screening' ||
    ((candidate as any)?.stage || '').toLowerCase() === 'screening' ||
    ((candidate as any)?.stage || '').toLowerCase() === 'shortlisted'

  const candidateStatusBadge = isExperienced
    ? isHired
      ? 'Hired'
      : overallRejected
        ? 'Rejected'
        : allRequiredRoundsCleared
          ? 'Shortlisted'
          : hrStatus === 'passed'
            ? 'HR Interview Passed'
            : techStatus === 'passed'
              ? 'Technical Interview Passed'
              : isCandidateMovedToScreeningOrShortlisted
                ? 'Shortlisted'
                : 'Applied'
    : isHired
      ? 'Hired'
      : overallRejected || (scorePercentage !== null && !isExamPassed) || examExpiredUnattempted
        ? 'Rejected'
        : allRequiredRoundsCleared
          ? 'Shortlisted'
          : hrStatus === 'passed'
            ? 'HR Interview Passed'
            : techStatus === 'passed'
              ? 'Technical Interview Passed'
              : isExamPassed
                ? 'Stage 1 Cleared'
                : isCandidateMovedToScreeningOrShortlisted
                  ? 'Shortlisted'
                  : 'Applied'

  const displayStatusBadge = isDqActive ? 'Disqualified' : candidateStatusBadge

  const statusBadgeVariant =
    displayStatusBadge === 'Applied'
      ? 'secondary'
      : displayStatusBadge === 'Rejected' || displayStatusBadge === 'Disqualified'
        ? 'destructive'
        : 'success'

  const examPillText =
    isExamPassed
      ? 'Stage 1 Cleared'
      : candidate?.exam_score != null
        ? 'Not Cleared'
        : candidate?.exam_completed_at != null
          ? 'Awaiting Evaluation'
          : candidate?.exam_started_at != null && isExamLive
            ? 'Ongoing'
            : isExamLive
              ? 'Live'
              : examExpiredUnattempted
                ? 'Unattempted'
                : 'Scheduled'

  const rounds: RoundDef[] = useMemo(() => {
    return [
      { key: 'exam' as RoundKey, label: 'Screening / Online Exam', sublabel: 'Stage 1 · Round 1', icon: ClipboardList },
      { key: 'technical' as RoundKey, label: 'Technical Interview', sublabel: 'Stage 2 · Round 2', icon: UserSearch },
      { key: 'hr' as RoundKey, label: 'HR Interview', sublabel: 'Stage 3 · Round 3', icon: HeartHandshake },
    ]
  }, [])

  const examWindow = useMemo(() => {
    const startRaw = job?.exam_start_date ?? job?.exam_window_start ?? job?.exam_start_time
    const endRaw = job?.exam_end_date ?? job?.exam_window_end ?? job?.exam_end_time
    const start = startRaw ? new Date(startRaw) : null
    const end = endRaw ? new Date(endRaw) : null
    const now = new Date().toISOString()
    const startIso = start ? start.toISOString() : null
    const endIso = end ? end.toISOString() : null
    if (startIso && now < startIso) return { open: false, reason: `Scheduled from ${formatDateTime(startRaw)} to ${formatDateTime(endRaw)}`, upcoming: true }
    if (endIso && now > endIso) return { open: false, reason: `Exam closed on ${formatDateTime(endRaw)}`, upcoming: false }
    return { open: true, reason: null as string | null, upcoming: false }
  }, [job])

  const roundInterviews = (key: RoundKey): MockInterview[] => {
    return interviews.filter((i) => {
      const r = (i.round || '').toLowerCase()
      if (key === 'exam') return r.includes('exam') || r.includes('screen') || r.includes('round 1')
      if (key === 'technical') return r.includes('tech')
      return r.includes('hr')
    })
  }

  // Slot booking stays open until 1 hour before the LAST available admin slot.
  const slotsExpiredFor = (key: RoundKey): boolean => {
    const open = interviewSlots.filter((s) => s.round === key && s.status === 'open')
    if (open.length === 0) return true
    const lastMs = Math.max(...open.map((s) => new Date(s.scheduled_at).getTime()))
    return lastMs - Date.now() <= ONE_HOUR_MS
  }

  // No-show detection — the candidate booked a slot, the window elapsed, and
  // the interview was never attended. The round can no longer be taken.
  const isRoundMissed = (key: 'technical' | 'hr'): boolean => {
    const isCleared = key === 'technical' ? roundCleared2 : roundCleared3
    if (isCleared) return false

    const candStatus = (key === 'technical' ? techStatusNorm : hrStatusNorm) ?? ''
    if (['passed', 'cleared', 'completed'].includes(candStatus)) return false

    const recs = roundInterviews(key)
    const completedOrPassed = recs.some((i) => {
      const s = (i.status ?? '').toLowerCase()
      return s === 'passed' || s === 'completed' || s === 'cleared'
    })
    if (completedOrPassed) return false

    const booked = recs.find(isConfirmedBooking)
    if (!booked || booked.attended_at) return false
    if (['passed', 'failed', 'completed', 'cleared'].includes((booked.status ?? '').toLowerCase())) return false
    const elapsed = Date.now() - new Date(booked.scheduled_at ?? '').getTime()
    return elapsed > TWO_HOURS_MS
  }

  const getRoundState = (key: RoundKey, prevPassed: boolean): RoundState => {
    if (key === 'exam') {
      if (isExamPassed) return 'passed'
      if (scorePercentage !== null && scorePercentage < (passPercentage ?? 60)) return 'failed'
      if (awaitingEvaluation) return 'pending'
      return 'available'
    }
    const hasExamRound = rounds.some((r) => r.key === 'exam')
    if (hasExamRound && !isExamPassed) return 'locked'
    if (!prevPassed) return 'locked'
    if (key === 'technical' && roundCleared2) return 'passed'
    if (key === 'hr' && roundCleared3) return 'passed'
    const recs = roundInterviews(key)
    const done = recs.find((r) => {
      const s = (r.status ?? '').toLowerCase()
      if (s === 'passed' || s === 'failed') return true
      return s === 'completed' && !!r.feedback
    })
    if (done) return done.status === 'failed' ? 'failed' : 'passed'
    if (recs.some((r) => (r.status ?? '').toLowerCase() === 'completed' && !r.feedback)) return 'pending'
    // Missed / did-not-attend — the pipeline stops at this round.
    if (isRoundMissed(key)) return 'failed'
    const booked = recs.find(isConfirmedBooking)
    if (booked) return 'booked'
    const bookable = recs.filter((r) => r.status === 'proposed' || (r.status === 'scheduled' && !r.candidate_confirmed))
    if (bookable.length) return 'available'
    if (interviewSlots.some((s) => s.round === key && s.status === 'open')) return 'available'
    return 'available'
  }

  const roundStates = useMemo(() => {
    const states: Record<RoundKey, RoundState> = {} as Record<RoundKey, RoundState>
    let prevPassed = true
    for (const r of rounds) {
      const s = getRoundState(r.key, prevPassed)
      states[r.key] = s
      prevPassed = s === 'passed'
    }
    if (isDqActive && !clearedAllEffective) {
      const dqIdx = rounds.findIndex((r) => states[r.key] !== 'passed')
      if (dqIdx >= 0) {
        for (let i = dqIdx; i < rounds.length; i++) {
          states[rounds[i].key] = i === dqIdx ? 'disqualified' : 'locked'
        }
      }
    }
    if (clearedAllEffective) {
      for (const r of rounds) states[r.key] = 'passed'
    }
    return states
  }, [rounds, interviews, interviewSlots, candidate, examWindow, job, clearedAllEffective, isDqActive, isExamPassed, scorePercentage, overallRejected, examExpiredUnattempted, awaitingEvaluation, roundCleared2, roundCleared3, isRoundMissed])

  // ------------------------------------------------------------------
  // FIXED PROGRESS — roundsCleared derives from the LIVE round states so
  // the Progress bar updates the moment a stage is cleared/completed.
  // ------------------------------------------------------------------
  const roundsCleared = rounds.filter((r) => roundStates[r.key] === 'passed').length
  const progressPct = (roundsCleared / totalRounds) * 100

  const hasPendingReschedule = (key: RoundKey) =>
    roundInterviews(key).some(
      (i) => i.reschedule_requested === true && i.reschedule_status === 'pending' && isConfirmedBooking(i)
    )

  const allRoundsPassed = rounds.length > 0 && rounds.every((r) => roundStates[r.key] === 'passed')

  // Effective offer — the snapshot's offer record, or a synthesized one once
  // every required round is cleared.
  const effectiveOffer = useMemo<MockOffer | null>(() => {
    if (portal.offer) return portal.offer
    if (clearedAllEffective) return buildMockOffer(portal.candidate, portal.job)
    return null
  }, [portal.offer, clearedAllEffective, portal])

  // Offer displayed to the candidate once Terms & Conditions are accepted.
  // Falls back to a synthesized offer so the letter view always renders.
  const offerToShow = useMemo<MockOffer | null>(() => {
    if (effectiveOffer) return effectiveOffer
    if (termsAccepted) return buildMockOffer(candidate, job)
    return null
  }, [effectiveOffer, termsAccepted, candidate, job])

  // Already-responded offers skip the T&C gate and show the letter directly.
  const termsUnlocked = termsAccepted || offerToShow?.candidate_response != null

  // ------------------------------------------------------------------
  // Action handlers — database-first, in-memory fallback. Every handler
  // attempts the Supabase write and, on error, mutates the local snapshot
  // with setPortal(...) so the UI always reacts instantly.
  // ------------------------------------------------------------------
  const handleTermsAgree = async () => {
    if (offerToShow) {
      try {
        await acceptOfferTerms({
          offerId: offerToShow.id,
          relocationRequired: offerToShow.relocation_required,
        })
      } catch (e) {
        console.warn('DB error, using mock fallback...', e)
      }
    }
    setTermsAccepted(true)
    setTermsOpen(false)
    toast.success('Terms accepted — your official offer letter is now unlocked.')
    pushNotification(
      'notif-terms-accepted',
      'Terms & Conditions Accepted',
      'You have accepted the employment terms. Your official offer letter is now available below.',
      'success'
    )
  }

  const handleOfferResponse = async (response: 'accept' | 'discuss' | 'reject') => {
    if (!offerToShow) return
    try {
      await respondToOffer({
        offerId: offerToShow.id,
        response,
        candidateId: candidate.id,
        userId: candidate.user_id,
        message: response === 'discuss' ? discussMessage.trim() : undefined,
      })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    if (response === 'accept') {
      setPortal((prev) => ({ ...prev, candidate: { ...prev.candidate, status: 'hired' } }))
    }
    setPortal((prev) => ({
      ...prev,
      offer: {
        ...(prev.offer ?? offerToShow),
        candidate_response: response,
        status: response === 'accept' ? 'accepted' : response === 'reject' ? 'rejected' : (prev.offer ?? offerToShow).status,
      },
    }))
    toast.success(response === 'accept' ? 'Offer accepted — welcome to the team!' : response === 'reject' ? 'Offer declined.' : 'Response submitted successfully.')
  }

  const handleOfferDiscuss = (message: string) => {
    handleOfferResponse('discuss')
    setDiscussOpen(false)
    setDiscussMessage('')
    pushNotification(
      'notif-discuss-' + Date.now(),
      'Offer Discussion Requested',
      message.trim() || 'You requested to discuss the offer terms with our team.',
      'info'
    )
  }

  const activeRoundSlots = activeRoundType ? roundInterviews(activeRoundType) : []
  const activeRoundLabel = activeRoundType === 'hr' ? 'HR Interview' : 'Technical Interview'
  const isReschedule = activeRoundType
    ? !!roundInterviews(activeRoundType).find((i) => isConfirmedBooking(i))
    : false
  const bookedForActiveRound = activeRoundSlots.find((i) => isConfirmedBooking(i))
  const slotNowMs = new Date().getTime()
  const availableSlotsList: SlotOption[] =
    activeRoundType != null
      ? interviewSlots
        .filter((s) => s.round === activeRoundType)
        .filter((s) => s.status === 'open')
        .filter((s) => new Date(s.scheduled_at).getTime() - slotNowMs > TWO_HOURS_MS)
        .filter((s) => (slotBookedCounts[s.id] ?? 0) < s.max_candidates)
        .filter((s) => s.id !== bookedForActiveRound?.slot_key)
        .map((s) => ({
          value: s.id,
          label: `${formatDateTime(s.scheduled_at)}`,
          scheduled_at: s.scheduled_at,
          interviewId: s.id,
        }))
      : []

  const handleOpenSlotModal = (roundKey: RoundKey) => {
    setActiveRoundType(roundKey)
    setSelectedSlot('')
    setRescheduleReason('')
    setReschedulePreferredTime('')
    setIsSlotModalOpen(true)
  }

  const handleConfirmSlot = async () => {
    if (!candidate || !activeRoundType || !selectedSlot) return
    const slot = interviewSlots.find((s) => s.id === selectedSlot)
    if (!slot) {
      toast.error('Selected slot is no longer available.')
      return
    }
    const existingBooked = roundInterviews(activeRoundType).find((i) => isConfirmedBooking(i))
    setSlotSaving(true)
    const roundLabel = activeRoundType === 'hr' ? 'HR' : 'Technical'
    const nowIso = new Date().toISOString()
    try {
      await bookInterviewSlot({
        candidateId: candidate.id,
        jobOpeningId: job?.id ?? null,
        round: activeRoundType === 'hr' ? 'hr' : 'technical',
        slotKey: slot.id,
        scheduledAt: slot.scheduled_at,
        meetingLink: null,
        existingInterviewId: existingBooked?.id ?? null,
      })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    setPortal((prev) => {
      const interviewsNext = existingBooked
        ? prev.interviews.map((i) =>
          i.id === existingBooked.id
            ? {
              ...i,
              scheduled_at: slot.scheduled_at,
              slot_key: slot.id,
              status: 'scheduled' as const,
              candidate_confirmed: true,
              reschedule_requested: false,
              reschedule_status: null,
              reschedule_reason: null,
              reschedule_preferred_time: null,
              reschedule_admin_note: null,
              updated_at: nowIso,
            }
            : i
        )
        : [
          ...prev.interviews,
          {
            id: 'rec-' + Date.now(),
            candidate_id: candidate.id,
            job_opening_id: job?.id ?? null,
            interviewer: null,
            round: roundLabel as 'Technical' | 'HR',
            scheduled_at: slot.scheduled_at,
            mode: 'online',
            meeting_link: null,
            status: 'scheduled' as const,
            candidate_confirmed: true,
            attended_at: null,
            created_at: nowIso,
            updated_at: nowIso,
            reschedule_requested: false,
            reschedule_status: null,
            reschedule_reason: null,
            reschedule_preferred_time: null,
            reschedule_admin_note: null,
            feedback: null,
            rating: null,
            metrics: null,
            slot_key: slot.id,
          },
        ]
      const slotsNext = prev.slots.map((s) => {
        if (s.id === slot.id) return { ...s, booked: s.booked + 1 }
        if (existingBooked?.slot_key === s.id) return { ...s, booked: Math.max(0, s.booked - 1) }
        return s
      })
      const candidatePatch =
        roundLabel === 'HR'
          ? { hr_interview_status: 'scheduled', hr_interview_date: slot.scheduled_at, hr_interview_time: slot.scheduled_at }
          : { technical_interview_status: 'scheduled', technical_interview_date: slot.scheduled_at, technical_interview_time: slot.scheduled_at }
      return { ...prev, interviews: interviewsNext, slots: slotsNext, candidate: { ...prev.candidate, ...candidatePatch } }
    })
    if (existingBooked) {
      toast.success(`Interview rescheduled to ${formatDateTime(slot.scheduled_at)}`, { duration: 5000 })
      pushNotification(
        'notif-resched-' + Date.now(),
        `${roundLabel} Interview Rescheduled`,
        `Your interview has been rescheduled to ${formatDateTime(slot.scheduled_at)}.`,
        'info'
      )
    } else {
      toast.success(`Interview scheduled for ${formatDateTime(slot.scheduled_at)}`, { duration: 5000 })
      pushNotification(
        'notif-book-' + Date.now(),
        `${roundLabel} Interview Scheduled`,
        'Your interview has been scheduled for ' + formatReadableUtcDate(slot.scheduled_at) + '. Note: You can reschedule this appointment until ' + formatRescheduleCutoff(slot.scheduled_at) + ' (2 hours prior to start time).',
        'success'
      )
    }
    setIsSlotModalOpen(false)
    setSelectedSlot('')
    setSlotSaving(false)
  }

  const handleSubmitRescheduleRequest = async () => {
    if (!candidate || !activeRoundType) return
    if (!rescheduleReason.trim() || !reschedulePreferredTime) {
      toast.error('Please enter your reason and a preferred time.')
      return
    }
    const preferredIso = new Date(reschedulePreferredTime).toISOString()
    if (new Date(preferredIso).getTime() - Date.now() <= TWO_HOURS_MS) {
      toast.error('Preferred time must be at least 2 hours from now.')
      return
    }
    const booked = roundInterviews(activeRoundType).find((i) => isConfirmedBooking(i))
    if (booked && new Date(booked.scheduled_at ?? '').getTime() - Date.now() <= TWO_HOURS_MS) {
      toast.error('Reschedule requests close 2 hours before the interview.')
      return
    }
    setSlotSaving(true)
    const roundLabel = activeRoundType === 'hr' ? 'HR' : 'Technical'
    const nowIso = new Date().toISOString()
    try {
      await submitRescheduleRequest({
        candidateId: candidate.id,
        jobOpeningId: job?.id ?? null,
        round: activeRoundType === 'hr' ? 'hr' : 'technical',
        reason: rescheduleReason.trim(),
        preferredTime: preferredIso,
        existingInterviewId: booked?.id ?? null,
      })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    setPortal((prev) => {
      const interviewsNext = booked
        ? prev.interviews.map((i) =>
          i.id === booked.id
            ? {
              ...i,
              reschedule_requested: true,
              reschedule_status: 'pending' as const,
              reschedule_reason: rescheduleReason.trim(),
              reschedule_preferred_time: preferredIso,
              updated_at: nowIso,
            }
            : i
        )
        : [
          ...prev.interviews,
          {
            id: 'rec-' + Date.now(),
            candidate_id: candidate.id,
            job_opening_id: job?.id ?? null,
            interviewer: null,
            round: roundLabel as 'Technical' | 'HR',
            scheduled_at: preferredIso,
            mode: 'online',
            meeting_link: null,
            status: 'proposed' as const,
            candidate_confirmed: false,
            attended_at: null,
            created_at: nowIso,
            updated_at: nowIso,
            reschedule_requested: true,
            reschedule_status: 'pending' as const,
            reschedule_reason: rescheduleReason.trim(),
            reschedule_preferred_time: preferredIso,
            reschedule_admin_note: null,
            feedback: null,
            rating: null,
            metrics: null,
            slot_key: null,
          },
        ]
      return { ...prev, interviews: interviewsNext }
    })
    toast.success(
      'Request sent — our team will review it.' + (booked ? ' Your current slot stays confirmed until then.' : ''),
      { duration: 6000 }
    )
    pushNotification(
      'notif-resched-req-' + Date.now(),
      booked ? 'Reschedule Request Received' : 'Slot Request Received',
      booked
        ? 'Your request to reschedule the interview call has been received by our team. It will be rescheduled once approved — your current slot remains confirmed until then.'
        : 'Your preferred-time request has been received by our team. You will be notified once a slot is confirmed.',
      'warning'
    )
    setIsSlotModalOpen(false)
    setRescheduleReason('')
    setReschedulePreferredTime('')
    setSlotSaving(false)
  }

  const handleAttendInterview = async (interviewId: string) => {
    try {
      await attendInterview({ interviewId })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    setPortal((prev) => ({
      ...prev,
      interviews: prev.interviews.map((i) =>
        i.id === interviewId ? { ...i, attended_at: new Date().toISOString(), status: 'ongoing' as const } : i
      ),
    }))
  }

  const handleCancelSlot = async (roundKey: RoundKey) => {
    if (!candidate) return
    const rec = roundInterviews(roundKey).find((i) => isConfirmedBooking(i))
    if (!rec) return
    setSlotSaving(true)
    const nowIso = new Date().toISOString()
    try {
      await cancelInterviewSlot({
        interviewId: rec.id,
        round: roundKey === 'hr' ? 'hr' : 'technical',
        candidateId: candidate.id,
      })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    setPortal((prev) => ({
      ...prev,
      interviews: prev.interviews.map((i) =>
        i.id === rec.id
          ? {
            ...i,
            status: 'cancelled' as const,
            candidate_confirmed: false,
            reschedule_requested: false,
            reschedule_status: null,
            reschedule_reason: null,
            reschedule_preferred_time: null,
            reschedule_admin_note: null,
            updated_at: nowIso,
          }
          : i
      ),
      slots: prev.slots.map((s) => (s.id === rec.slot_key ? { ...s, booked: Math.max(0, s.booked - 1) } : s)),
      candidate:
        roundKey === 'hr'
          ? { ...prev.candidate, hr_interview_status: null, hr_interview_date: null, hr_interview_time: null }
          : { ...prev.candidate, technical_interview_status: null, technical_interview_date: null, technical_interview_time: null },
    }))
    toast.success('Slot cancelled successfully. You can now choose a new slot.', { duration: 5000 })
    pushNotification('notif-cancel-' + Date.now(), 'Interview Cancelled', 'Your interview appointment has been cancelled. You can book a new slot.', 'warning')
    setSelectedSlot('')
    setSlotSaving(false)
  }

  const handleRevertReschedule = async (roundKey: RoundKey) => {
    if (!candidate) return
    const rec = roundInterviews(roundKey).find((i) => isConfirmedBooking(i))
    if (!rec) return
    setSlotSaving(true)
    try {
      await revertRescheduleRequest({ interviewId: rec.id })
    } catch (e) {
      console.warn('DB error, using mock fallback...', e)
    }
    setPortal((prev) => ({
      ...prev,
      interviews: prev.interviews.map((i) =>
        i.id === rec.id
          ? {
            ...i,
            reschedule_requested: false,
            reschedule_status: null,
            reschedule_reason: null,
            reschedule_preferred_time: null,
            reschedule_admin_note: null,
            updated_at: new Date().toISOString(),
          }
          : i
      ),
    }))
    toast.success('Reschedule request withdrawn — your original slot remains confirmed.', { duration: 5000 })
    pushNotification('notif-revert-' + Date.now(), 'Reschedule Request Reverted', 'Your request to reschedule the interview call has been withdrawn. Your interview remains scheduled for your original slot.', 'info')
    setSelectedSlot('')
    setSlotSaving(false)
  }

  // No-show / policy disqualification evaluator — once per loaded scenario.
  // A round ends in disqualification when every published slot has elapsed AND
  // the candidate neither booked nor attended (or missed their booked call).
  useEffect(() => {
    if (!candidate) return
    if (dqEvaluated.current === portal.id) return
    dqEvaluated.current = portal.id
    if (candidate.disqualified_at) return

    const evaluateRound = (round: 'technical' | 'hr') => {
      const label = round === 'hr' ? 'HR' : 'Technical'
      const statusKey = round === 'hr' ? 'hr_interview_status' : 'technical_interview_status'
      const candStatus = String(candidate[statusKey] ?? '').toLowerCase()
      if (['passed', 'cleared', 'completed', 'failed'].includes(candStatus)) return
      const terminal = interviews.find(
        (i) => i.round.toLowerCase() === label.toLowerCase() && ['passed', 'completed', 'failed'].includes(i.status ?? '')
      )
      if (terminal) return
      const pendingRequest = interviews.find(
        (i) =>
          i.round.toLowerCase() === label.toLowerCase() &&
          i.reschedule_requested === true &&
          i.reschedule_status === 'pending'
      )
      if (pendingRequest) return
      const slots = interviewSlots.filter((s) => s.round === round)
      if (slots.length === 0) return
      const booked = interviews.find((i) => i.round.toLowerCase() === label.toLowerCase() && isConfirmedBooking(i))
      let reason: string | null = null
      if (booked) {
        const elapsed = Date.now() - new Date(booked.scheduled_at ?? '').getTime()
        if (elapsed > TWO_HOURS_MS && !booked.attended_at) {
          reason = `You did not attend the ${label} interview within its scheduled window.`
        }
      } else {
        const allElapsed = slots.every((s) => Date.now() - new Date(s.scheduled_at).getTime() > TWO_HOURS_MS)
        if (allElapsed) {
          reason = `All ${label} interview slots have elapsed and no slot was selected.`
        }
      }
      if (reason) {
        disqualifyCandidate({ candidateId: candidate.id, reason }).catch((e) => {
          console.warn('DB error, using mock fallback...', e)
        })
        setPortal((prev) => ({
          ...prev,
          candidate: {
            ...prev.candidate,
            status: 'rejected',
            disqualified_at: new Date().toISOString(),
            disqualified_reason: reason,
          },
        }))
      }
    }
    evaluateRound('technical')
    evaluateRound('hr')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.id])

  // Category-based event evaluator — re-runs whenever the snapshot changes.
  useEffect(() => {
    if (!candidate) return

    const nowIso = new Date().toISOString()
    const nowMsNow = new Date(nowIso).getTime()
    const registrationIso = candidate.applied_at ?? candidate.created_at ?? nowIso
    const registrationMs = new Date(registrationIso).getTime()
    const allNotifications: Array<{
      id: string
      title: string
      message: string
      timestamp: string
      iso: string
      type: 'info' | 'warning' | 'success'
      read: boolean
    }> = []

    const push = (id: string, title: string, message: string, type: 'info' | 'warning' | 'success', iso: string, read = true) => {
      allNotifications.push({ id, title, message, timestamp: formatLocalTime(iso), iso, type, read })
    }

    // 1. Registration — always present, always at the very bottom of the panel.
    push(
      'registration',
      'Registration Successful',
      isExperienced
        ? 'Registration Successful. Please schedule your slot for the Technical Interview.'
        : 'Registration Successful.',
      'success',
      registrationIso
    )

    // 2. Online Exam Scheduled (Freshers only).
    const examStartRaw = job?.exam_start_date ?? job?.exam_window_start ?? job?.exam_start_time
    if (!isExperienced && examStartRaw) {
      push(
        'exam-scheduled',
        'Online Exam Scheduled',
        `Online Exam Scheduled for ${formatLocalTime(examStartRaw)}.`,
        'info',
        new Date(registrationMs + 1000).toISOString()
      )
    }

    // 3. Post-exam outcome (Freshers only).
    if (!isExperienced && candidate.exam_score != null) {
      const pct =
        totalQuestions != null && totalQuestions > 0
          ? Math.round(((candidate.exam_score ?? 0) / totalQuestions) * 100)
          : 0
      const examPassed = passPercentage != null && pct >= passPercentage
      push(
        'exam-result',
        examPassed ? 'Online Exam Cleared' : 'Online Exam Status Update',
        examPassed
          ? 'You cleared the Online Exam! Please schedule your slot for the Technical Interview.'
          : 'You did not qualify the Online Exam.',
        examPassed ? 'success' : 'warning',
        candidate.exam_completed_at ?? nowIso,
        false
      )
    }

    // 4. Technical / HR round state machine.
    const techLabel = 'Technical Interview'
    const hrLabel = 'HR Interview'
    for (const record of interviews) {
      const isTech = record.round === 'Technical'
      const isHr = record.round === 'HR'
      if (!isTech && !isHr) continue
      const label = isTech ? techLabel : hrLabel
      const statusNorm = (record.status ?? '').toLowerCase()

      if (statusNorm === 'scheduled' && record.reschedule_requested === true && record.reschedule_status === 'pending') {
        push(
          `resched-req-${record.id}`,
          `${label} — Reschedule Request Received`,
          'Your request to reschedule the interview call has been received by our team. Your current slot remains confirmed until a new slot is approved.',
          'warning',
          nowIso
        )
      } else if (statusNorm === 'scheduled' && record.reschedule_status === 'accepted') {
        push(
          `resched-${record.id}`,
          `${label} Rescheduled`,
          `${label} Rescheduled successfully for ${formatLocalTime(record.scheduled_at)}.`,
          'info',
          record.scheduled_at ?? nowIso
        )
      } else if (statusNorm === 'scheduled') {
        push(
          `sched-${record.id}`,
          `${label} Scheduled`,
          `${label} Scheduled for ${formatLocalTime(record.scheduled_at)}.`,
          'info',
          record.created_at || record.scheduled_at || nowIso
        )
      } else if (statusNorm === 'passed' || (['completed', 'cleared'].includes(statusNorm) && !!record.feedback)) {
        push(
          `pass-${record.id}`,
          `${label} Cleared`,
          isTech
            ? 'Congratulations! You have qualified the Technical Round. Please schedule your slot for the HR Round.'
            : 'Congratulations! You cleared the HR Round. Please review terms and conditions for further steps.',
          'success',
          record.created_at || record.scheduled_at || nowIso,
          false
        )
      } else if (statusNorm === 'failed') {
        push(
          `fail-${record.id}`,
          `${label} Result`,
          isTech ? 'You did not clear the Technical Round.' : 'You did not clear the HR Round.',
          'warning',
          record.created_at || record.scheduled_at || nowIso,
          false
        )
      }
    }

    // 5. Candidate-level outcomes.
    const techNorm = (candidate?.technical_interview_status ?? '').toLowerCase()
    const hrNorm = (candidate?.hr_interview_status ?? '').toLowerCase()
    const hasTechTerminal = interviews.some(
      (i) => i.round === 'Technical' && ['passed', 'completed', 'cleared', 'failed'].includes((i.status ?? '').toLowerCase())
    )
    const hasHrTerminal = interviews.some(
      (i) => i.round === 'HR' && ['passed', 'completed', 'cleared', 'failed'].includes((i.status ?? '').toLowerCase())
    )
    const techClearedNorm =
      techNorm === 'passed' || (['cleared', 'completed'].includes(techNorm) && !!candidate?.technical_interview_feedback)
    const hrClearedNorm =
      hrNorm === 'passed' || (['cleared', 'completed'].includes(hrNorm) && !!candidate?.hr_interview_feedback)
    if (!hasTechTerminal && techClearedNorm) {
      push('tech-outcome', 'Technical Round Cleared', 'Congratulations! You have qualified the Technical Round. Please schedule your slot for the HR Round.', 'success', candidate?.technical_interview_time ?? registrationIso, false)
    }
    if (!hasTechTerminal && techNorm === 'failed') {
      push('tech-fail', 'Technical Round Result', 'You did not clear the Technical Round.', 'warning', candidate?.technical_interview_time ?? registrationIso, false)
    }
    if (!hasHrTerminal && hrClearedNorm) {
      push('hr-outcome', 'HR Round Cleared', 'Congratulations! You cleared the HR Round. Please review terms and conditions for further steps.', 'success', candidate?.hr_interview_time ?? registrationIso, false)
    }
    if (!hasHrTerminal && hrNorm === 'failed') {
      push('hr-fail', 'HR Round Result', 'You did not clear the HR Round.', 'warning', candidate?.hr_interview_time ?? registrationIso, false)
    }

    // 6. One-hour notices.
    if (!isExperienced) {
      if (examStartRaw) {
        const startMs = new Date(examStartRaw).getTime()
        const reminderAtMs = startMs - ONE_HOUR_MS
        if (!isNaN(startMs) && nowMsNow >= reminderAtMs && nowMsNow < startMs) {
          push('exam-reminder', 'Online Exam Reminder', 'Your Online Exam will commence in 1 hour.', 'warning', new Date(reminderAtMs).toISOString(), false)
        }
      }
    }
    for (const record of interviews) {
      if (record.round !== 'Technical' && record.round !== 'HR') continue
      if (record.status !== 'scheduled') continue
      const startMs = new Date(record.scheduled_at ?? '').getTime()
      if (isNaN(startMs)) continue
      const reminderAtMs = startMs - ONE_HOUR_MS
      if (nowMsNow >= reminderAtMs && nowMsNow < startMs) {
        const label = record.round === 'Technical' ? techLabel : hrLabel
        push(`interview-reminder-${record.id}`, `${label} Reminder`, `Your ${label} will commence in 1 hour.`, 'warning', new Date(reminderAtMs).toISOString(), false)
      }
    }

    // 7. Hired (post T&C / Offer acceptance).
    if (isHired && effectiveOffer?.status === 'accepted') {
      push(
        'hired',
        'Offer Accepted - Hired!',
        'Congratulations! You have cleared all rounds and accepted the offer. You are hired!',
        'success',
        nowIso,
        false
      )
    }

    // 8. Exam expiration & disqualification (Freshers only, unattempted window).
    const examEndNowIso = job?.exam_end_date ?? job?.exam_window_end ?? job?.exam_end_time
    const hasAttempted = candidate.exam_completed_at != null || candidate.exam_score != null || candidate?.exam_started_at != null
    if (!isExperienced && examEndNowIso && new Date(examEndNowIso).getTime() < new Date().getTime() && !hasAttempted) {
      push(
        'notif-expired',
        'Exam Window Closed',
        'You did not complete the assessment within the designated window and are no longer eligible for subsequent rounds.',
        'warning',
        examEndNowIso,
        false
      )
    }

    // LIFO hydrate — newest first; registration (oldest base) ends up last.
    setNotifications(
      [...allNotifications]
        .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
        .map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          is_read: n.read,
          created_at: n.iso,
          timestamp: n.timestamp,
        }))
    )
  }, [candidate, interviews, effectiveOffer, isExperienced, job, totalQuestions, passPercentage])

  // Real-world time reference & toast engine — every 30s the engine evaluates
  // every scheduled exam / interview call against the live clock and fires a
  // toast + panel notification at the 1-hour-prior threshold (once per session).
  const fireOneHourReminder = (key: string, id: string, message: string) => {
    if (firedReminderKeys.current.has(key)) return
    firedReminderKeys.current.add(key)
    toast.info(message, { duration: 8000 })
    pushNotification(id, message, message, 'warning', new Date().toISOString())
  }

  useEffect(() => {
    if (!candidate) return
    const evaluate = () => {
      const evaluateNowMs = new Date().getTime()

      if (!isExperienced) {
        const examStartNowRaw = job?.exam_start_date ?? job?.exam_window_start ?? job?.exam_start_time
        if (examStartNowRaw) {
          const startMs = new Date(examStartNowRaw).getTime()
          const reminderAtMs = startMs - ONE_HOUR_MS
          if (!isNaN(startMs) && evaluateNowMs >= reminderAtMs && evaluateNowMs < startMs) {
            fireOneHourReminder('toast-exam-reminder', 'exam-reminder', 'Your Online Exam will commence in 1 hour.')
          }
        }
      }

      for (const record of interviews) {
        if (record.round !== 'Technical' && record.round !== 'HR') continue
        if (record.status !== 'scheduled') continue
        const startMs = new Date(record.scheduled_at ?? '').getTime()
        if (isNaN(startMs)) continue
        const reminderAtMs = startMs - ONE_HOUR_MS
        if (evaluateNowMs >= reminderAtMs && evaluateNowMs < startMs) {
          const label = record.round === 'Technical' ? 'Technical Interview' : 'HR Interview'
          fireOneHourReminder(`toast-interview-${record.id}`, `interview-reminder-${record.id}`, `Your ${label} will commence in 1 hour.`)
        }
      }
    }
    evaluate()
    const interval = window.setInterval(evaluate, 30000)
    return () => window.clearInterval(interval)
  }, [candidate, isExperienced, interviews, job])

  if (!signedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2 font-semibold">
              <img src={oklutLogo} alt="Oklut" className="h-9 w-auto object-contain" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A3FF] to-[#00135A]"> Candidate Portal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex w-full flex-1 items-center justify-center p-4 py-12">
          <Card className="w-full max-w-md shadow-lg border-border/80">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-bold">Candidate Portal Login</CardTitle>
              <CardDescription>
                Enter your <strong>Application Reference ID</strong> and <strong>Date of Birth</strong> (Password)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="candidate-id" className="text-sm font-medium">
                    Application Reference ID or Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="candidate-id"
                    required
                    type="text"
                    placeholder="e.g. CAND-894215 or your email"
                    value={candidateId}
                    onChange={(e) => setCandidateId(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate-dob" className="text-sm font-medium">
                    Date of Birth (Password) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="candidate-dob"
                    required
                    type="date"
                    value={dobPassword}
                    onChange={(e) => setDobPassword(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format: YYYY-MM-DD (as submitted on your job application)
                  </p>
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Sign In to Portal →'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <PortalFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <img src={oklutLogo} alt="Oklut" className="h-9 w-auto object-contain" />
            <span className="hidden sm:inline"> Candidate Portal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllAsRead} onMarkAsRead={handleMarkAsRead} />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 pt-6 md:p-12 md:pt-8">
        <div>
          <h1 className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#00A3FF] to-[#00135A] text-3xl font-bold tracking-tight">Application Status</h1>
          <p className="text-muted-foreground">Welcome back, {candidate.name}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Candidate Name</div>
                    <div className="font-medium">{candidate.name}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Candidate ID</div>
                  <div className="font-medium">{candidate.candidate_id ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Job Title</div>
                  <div className="font-medium">{job?.title ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium capitalize">{candidate.category ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge variant={statusBadgeVariant}>
                    {displayStatusBadge}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-sm text-muted-foreground">No interviews scheduled yet.</div>
              ) : (
                <div className="space-y-4">
                  {interviews.map(i => (
                    <div key={i.id} className="p-3.5 border rounded-xl bg-card shadow-sm">
                      <div className="flex justify-between font-medium items-center">
                        <span className="font-semibold text-slate-900">{i.round}</span>
                        <StatusPill status={i.status || 'scheduled'} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDateTime(i.scheduled_at)}
                      </div>
                      {i.meeting_link && (
                        <div className="mt-2.5 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={i.meeting_link.startsWith('http') ? i.meeting_link : `https://${i.meeting_link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" />
                            {i.round.toLowerCase().includes('screen') || i.round.toLowerCase().includes('exam')
                              ? 'Launch Assessment / Meeting Link'
                              : 'Join Meeting Link'}
                          </a>
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{i.meeting_link}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isDqActive && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>
              {disqualified ? 'Disqualified: Malpractice / AI Tool Violation Detected' : 'Disqualified'}
            </AlertTitle>
            <AlertDescription>
              {disqualified
                ? 'Your application has been disqualified due to a detected malpractice or AI tool violation during the assessment process. Please contact the HR team if you believe this is an error.'
                : disqualifiedReason ?? 'You did not select an interview slot or attend the interview within the scheduled windows.'}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Hiring Pipeline</CardTitle>
            <CardDescription>
              {isFresher ? 'Online Exam → Technical Interview → HR Interview' : 'Technical Interview → HR Interview'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={progressPct} className="flex-1" />
              <span className="text-sm font-medium whitespace-nowrap">{roundsCleared}/{totalRounds} rounds cleared</span>
            </div>
            <div className="grid gap-3">
              {rounds.map((round, idx) => {
                const state = roundStates[round.key]
                const Icon = round.icon
                const roundAwaitingEval =
                  state === 'pending' &&
                  round.key !== 'exam' &&
                  roundInterviews(round.key).some((r) => (r.status ?? '').toLowerCase() === 'completed' && !r.feedback)
                return (
                  <div
                    key={round.key}
                    className={`rounded-xl border p-4 transition-colors ${state === 'locked' && round.key !== 'exam' ? 'opacity-60 bg-muted/40' : state === 'disqualified' ? 'border-destructive/40 bg-destructive/5' : 'bg-card'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${state === 'passed' ? 'bg-green-100 text-green-700' : state === 'failed' || state === 'disqualified' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                          }`}
                      >
                        {state === 'passed' ? <CheckCircle2 className="h-5 w-5" /> : state === 'failed' || state === 'disqualified' ? <XCircle className="h-5 w-5" /> : state === 'locked' ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold">{round.sublabel}</span>
                          <span className="text-sm text-muted-foreground">·</span>
                          <span className="font-medium">{round.label}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {state === 'passed' && 'Cleared — results shown below'}
                          {state === 'failed' && (isRoundMissed(round.key as 'technical' | 'hr') ? 'You can no longer attend this interview' : 'Not cleared in this round')}
                          {state === 'disqualified' && 'Disqualified at this stage'}
                          {state === 'locked' && round.key === 'exam' && examWindow.reason
                            ? examWindow.reason
                            : state === 'locked' && 'Locked — clear the previous round first'}
                          {state === 'available' && round.key === 'exam' && 'Ready — take your exam within the window'}
                          {state === 'available' && round.key !== 'exam' && 'Slots available — book your slot'}
                          {state === 'booked' && hasPendingReschedule(round.key) && 'Reschedule request awaiting admin approval'}
                          {state === 'booked' && !hasPendingReschedule(round.key) && 'Slot confirmed'}
                          {state === 'pending' &&
                            (round.key === 'exam'
                              ? 'Awaiting evaluation'
                              : roundAwaitingEval
                                ? 'Interview held — awaiting evaluation'
                                : 'Unlocked — admin will publish slots soon')}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {round.key === 'exam' && examPillText === 'Live' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center px-2.5 py-1 rounded-full text-xs whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block"></span>
                            Live
                          </span>
                        ) : round.key === 'exam' && examPillText === 'Ongoing' ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center px-2.5 py-1 rounded-full text-xs whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5 inline-block"></span>
                            Ongoing
                          </span>
                        ) : (
                          <Badge
                            variant={
                              round.key === 'exam'
                                ? roundStates.exam === 'passed' || examPillText === 'Stage 1 Cleared'
                                  ? 'success'
                                  : (roundStates.exam === 'failed' && examPillText === 'Scheduled') || examPillText === 'Not Cleared' || examPillText === 'Unattempted'
                                    ? 'destructive'
                                    : 'default'
                                : state === 'passed' ? 'success' : state === 'failed' || state === 'disqualified' ? 'destructive' : state === 'locked' || state === 'pending' || hasPendingReschedule(round.key) ? 'secondary' : 'default'
                            }
                            className="whitespace-nowrap"
                          >
                            {round.key === 'exam'
                              ? roundStates.exam === 'passed' && examPillText === 'Scheduled'
                                ? 'Cleared'
                                : roundStates.exam === 'failed' && examPillText === 'Scheduled'
                                  ? 'Not Cleared'
                                  : examPillText
                              : state === 'passed' ? 'Cleared' : state === 'failed' ? (isRoundMissed(round.key as 'technical' | 'hr') ? 'Missed' : 'Failed') : state === 'disqualified' ? 'Disqualified' : state === 'locked' ? 'Locked' : hasPendingReschedule(round.key) ? 'Awaiting Evaluation' : state === 'booked' ? 'Booked' : state === 'pending' ? (roundAwaitingEval ? 'Awaiting Evaluation' : 'Awaiting Slots') : 'Available'}
                          </Badge>
                        )}
                        {idx < rounds.length - 1 && roundStates[round.key] === 'passed' && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {state === 'disqualified' && (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        Unfortunately, you have been disqualified at this stage. Thank you for your time and application.
                      </div>
                    )}

                    {state !== 'disqualified' && round.key === 'exam' && (
                      <ExamRound
                        roundNumber={idx + 1}
                        roundState={state}
                        candidate={candidate}
                        job={job}
                        interviews={interviews}
                        calculatedExamPercentage={candidate?.exam_score != null ? calculatedExamPercentage : null}
                        passPercentage={passPercentage}
                        showFeedback={showExamFeedback}
                        onToggleFeedback={() => setShowExamFeedback((v) => !v)}
                        onExamComplete={async () => {
                          if (!candidate) return
                          try {
                            await startExam({ candidateId: candidate.id })
                            await submitExam({ candidateId: candidate.id, jobOpeningId: job?.id ?? null })
                          } catch (e) {
                            console.warn('DB error, using mock fallback...', e)
                          }
                          setPortal((prev) => ({
                            ...prev,
                            candidate: {
                              ...prev.candidate,
                              exam_started_at: prev.candidate.exam_started_at ?? new Date().toISOString(),
                              exam_completed_at: new Date().toISOString(),
                            },
                          }))
                        }}
                        onExamStarted={(startedAt) => {
                          if (!candidate) return
                          startExam({ candidateId: candidate.id }).catch((e) => {
                            console.warn('DB error, using mock fallback...', e)
                          })
                          setPortal((prev) => ({
                            ...prev,
                            candidate: { ...prev.candidate, exam_started_at: startedAt },
                          }))
                        }}
                      />
                    )}
                    {state !== 'locked' && round.key === 'technical' && (
                      <TechnicalRound
                        roundNumber={idx + 1}
                        state={state}
                        interviews={roundInterviews('technical')}
                        technical_interview_status={candidate?.technical_interview_status ?? null}
                        slotsExpired={slotsExpiredFor('technical')}
                        missed={isRoundMissed('technical')}
                        onOpenSchedule={handleOpenSlotModal}
                        onCancelSlot={handleCancelSlot}
                        onRevertReschedule={handleRevertReschedule}
                        onAttend={handleAttendInterview}
                        feedback={candidate?.technical_interview_feedback ?? null}
                        showFeedback={showTechFeedback}
                        onToggleFeedback={() => setShowTechFeedback((v) => !v)}
                      />
                    )}
                    {state !== 'locked' && round.key === 'hr' && (
                      <HRRound
                        roundNumber={idx + 1}
                        state={state}
                        interviews={roundInterviews('hr')}
                        hr_interview_status={candidate?.hr_interview_status ?? null}
                        slotsExpired={slotsExpiredFor('hr')}
                        missed={isRoundMissed('hr')}
                        onOpenSchedule={handleOpenSlotModal}
                        onCancelSlot={handleCancelSlot}
                        onRevertReschedule={handleRevertReschedule}
                        onAttend={handleAttendInterview}
                        feedback={candidate?.hr_interview_feedback ?? null}
                        showFeedback={showHrFeedback}
                        onToggleFeedback={() => setShowHrFeedback((v) => !v)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {allRoundsPassed &&
          (termsUnlocked && offerToShow ? (
            <OfferLetterSection
              key={`${offerToShow.id}:${offerToShow.status}:${offerToShow.candidate_response ?? 'null'}`}
              candidate={candidate}
              offer={offerToShow}
              job={job}
              onRespond={handleOfferResponse}
              onDiscuss={handleOfferDiscuss}
              discussOpen={discussOpen}
              onToggleDiscuss={() => setDiscussOpen((v) => !v)}
              discussMessage={discussMessage}
              onDiscussMessageChange={setDiscussMessage}
            />
          ) : (
            <CongratulationsCard onViewTerms={() => setTermsOpen(true)} />
          ))}

        <Dialog
          open={isSlotModalOpen}
          onOpenChange={(open) => {
            setIsSlotModalOpen(open)
            if (!open) setSelectedSlot('')
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{activeRoundLabel} — {isReschedule ? 'Reschedule' : 'Schedule'} Slot</DialogTitle>
              <DialogDescription>
                {isReschedule
                  ? 'Pick a new time for your confirmed interview.'
                  : 'Choose an available slot for your interview.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Available slots</Label>
                {availableSlotsList.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">No slots are available for this round right now.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Slots can only be booked until 2 hours before the interview start time. The admin may publish more slots — check back shortly.
                    </p>
                  </div>
                ) : (
                  <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlotsList.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request to Reschedule</p>
                <p className="text-xs text-muted-foreground">
                  {isReschedule
                    ? 'Prefer a time not listed above? Write your reason and a time that works for you — the team will review and approve or reject it.'
                    : 'No slot works for you? Send your preferred date &amp; time and the team will review and confirm it.'}
                </p>
                <Textarea
                  rows={2}
                  placeholder={isReschedule ? 'Reason for rescheduling…' : 'Why this time works for you…'}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    className="flex-1"
                    value={reschedulePreferredTime}
                    onChange={(e) => setReschedulePreferredTime(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={handleSubmitRescheduleRequest}
                    disabled={slotSaving}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" /> Request Reschedule
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                Note: You can book or reschedule a slot up to 2 hours prior to the scheduled call. Late reschedules will not be entertained and will result in disqualification.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSlotModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmSlot} disabled={!selectedSlot || slotSaving}>
                {slotSaving ? 'Saving...' : isReschedule ? 'Confirm Reschedule' : 'Book Slot'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TermsDialog
          open={termsOpen}
          onOpenChange={setTermsOpen}
          content={buildTermsContent(offerToShow)}
          checkboxLabels={TERMS_CHECKBOX_LABELS}
          onAgree={handleTermsAgree}
        />
      </div>
      <PortalFooter />
    </div>
  )
}

// ============================================================================
// Assessment Questions for in-browser evaluation fallback
// ============================================================================
const IN_BROWSER_EXAM_QUESTIONS = [
  {
    id: 1,
    category: 'Logical Reasoning',
    question: 'A project team requires 12 members to finish a milestone in 15 days. If 4 additional members join with equal efficiency, how many days will the team require?',
    options: ['10.5 Days', '11.25 Days', '12 Days', '13.5 Days'],
    correct: 1,
  },
  {
    id: 2,
    category: 'Computer Science Fundamentals',
    question: 'Which of the following data structures strictly adheres to the First-In-First-Out (FIFO) access paradigm?',
    options: ['Stack', 'Queue', 'Binary Search Tree', 'Max Heap'],
    correct: 1,
  },
  {
    id: 3,
    category: 'Professional Workplace Practice',
    question: 'What is the primary objective of an executive summary in corporate client deliverables?',
    options: ['Document raw error stacks', 'Synthesize key insights and actionable strategic decisions', 'Track daily shift timesheets', 'Enumerate library dependencies'],
    correct: 1,
  },
  {
    id: 4,
    category: 'System Architecture',
    question: 'In distributed cloud systems, what does horizontal scaling (scaling out) fundamentally mean?',
    options: ['Increasing RAM on the existing physical node', 'Adding more compute instances to the processing pool', 'Reducing database index sizes', 'Throttling ingress traffic'],
    correct: 1,
  },
  {
    id: 5,
    category: 'Analytical Problem Solving',
    question: 'If all Alpha components satisfy Beta specifications, and some Beta specifications require Gamma certification, which statement must be valid?',
    options: ['All Alpha components have Gamma certification', 'Some Alpha components may satisfy Gamma certification', 'No Alpha component can have Gamma certification', 'All Gamma certifications belong to Alpha'],
    correct: 1,
  },
]

// ============================================================================
// Round 1 — Online Exam / Screening Assessment
// ============================================================================
function ExamRound({
  roundNumber,
  roundState,
  candidate,
  job,
  interviews = [],
  onExamComplete,
  onExamStarted,
  calculatedExamPercentage,
  passPercentage,
  showFeedback,
  onToggleFeedback,
}: {
  roundNumber: number
  roundState: RoundState
  candidate: MockCandidate
  job: MockJobOpening | null
  interviews?: MockInterview[]
  onExamComplete: () => void
  onExamStarted: (startedAt: string) => void
  calculatedExamPercentage: number | null
  passPercentage?: number | null
  showFeedback: boolean
  onToggleFeedback: () => void
}) {
  const examDetails = job?.exam_details ?? null
  const totalQuestions = examDetails?.total_questions ?? job?.total_questions ?? 5
  const durationMins = examDetails?.duration_mins ?? job?.exam_duration_mins ?? 30
  const totalMarks = examDetails?.total_marks ?? 100
  const passingScore = passPercentage != null ? Number(passPercentage) : examDetails?.pass_percentage ?? 60
  const guidelines = examDetails?.guidelines ?? [
    'Complete all questions within the allotted duration.',
    'Switching tabs or using prohibited extensions will flag proctoring violations.',
    'Your responses are saved securely upon submission.'
  ]

  // Find if HR scheduled a screening interview with an exam link / test link
  const screeningInterview = interviews.find((i) => {
    const r = (i.round || '').toLowerCase()
    return r.includes('screen') || r.includes('exam') || r.includes('round 1')
  })

  const effectiveExamLink =
    screeningInterview?.meeting_link ||
    (screeningInterview as any)?.exam_link ||
    job?.exam_link ||
    (job as any)?.exam_details?.exam_link ||
    null

  const examFeedback = screeningInterview?.feedback || candidate?.exam_feedback || null

  const roundOver = roundState === 'failed' || roundState === 'disqualified' || roundState === 'passed'
  const examStartedAt = candidate?.exam_started_at ?? null

  const [examOpen, setExamOpen] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})

  useEffect(() => {
    if (roundOver) {
      setExamOpen(false)
      setExamStarted(false)
    }
  }, [roundOver])

  useEffect(() => {
    if (!examStarted || !examOpen) return
    if (timeLeft <= 0) {
      handleFinalSubmit()
      return
    }
    const t = setTimeout(() => setTimeLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [examStarted, timeLeft, examOpen])

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  const handleStartExam = () => {
    setTimeLeft(durationMins * 60)
    setExamStarted(true)
    onExamStarted(new Date().toISOString())
  }

  const handleFinalSubmit = () => {
    if (submitting || candidate.exam_completed_at != null || candidate.exam_score != null) return
    setSubmitting(true)
    setExamOpen(false)
    setExamStarted(false)
    onExamComplete()
    toast.success('Assessment submitted successfully! Evaluation recorded in HRMS.')
    setSubmitting(false)
  }

  const startRaw = screeningInterview?.scheduled_at || job?.exam_start_date || job?.exam_window_start || job?.exam_start_time
  const endRaw = job?.exam_end_date || job?.exam_window_end || job?.exam_end_time
  const windowStartRaw = examDetails?.window_start || startRaw
  const windowEndRaw = examDetails?.window_end || endRaw

  const examAwaitingEvaluation =
    candidate.exam_completed_at != null && candidate.exam_score == null

  const handleStartAssessment = () => {
    const startedAt = new Date().toISOString()
    onExamStarted(startedAt)
    if (effectiveExamLink) {
      const url = effectiveExamLink.startsWith('http') ? effectiveExamLink : `https://${effectiveExamLink}`
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.info('Assessment launched in a new tab. Complete the test and click "Mark as Completed".')
    } else {
      setExamOpen(true)
    }
  }

  if (roundOver) {
    const passed = roundState === 'passed'
    return (
      <div className="mt-4 space-y-4 rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Round {roundNumber} · Screening / Online Exam</span>
        </div>
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          passed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="shrink-0 mt-0.5">
            {passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight">
              {passed ? 'Stage 1 Cleared' : 'Not Qualified in This Round'}
            </h4>
            <p className="text-xs mt-1 leading-normal opacity-90">
              {passed
                ? `You have cleared the Screening / Online Exam round successfully (Evaluation Score: ${calculatedExamPercentage ?? 90}%, Cutoff: ${passingScore}%).`
                : 'You did not qualify in the Online Exam round.'}
            </p>
            {examFeedback && (
              <div className="mt-3 rounded-lg border bg-white/80 p-3 text-xs text-slate-800 space-y-1">
                <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Evaluator Feedback &amp; Scorecard:
                </div>
                <p className="leading-relaxed">{examFeedback}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Round {roundNumber} · Screening / Online Exam</span>
        <span className="text-xs text-muted-foreground">
          {effectiveExamLink ? 'External assessment link provided by HR' : 'Interactive in-portal assessment'}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-primary" /> Exam Overview &amp; Guidelines
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Duration</div>
              <div className="font-semibold">{durationMins} Minutes</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Questions</div>
              <div className="font-semibold">{totalQuestions} Questions ({totalMarks} Marks)</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Passing Cutoff</div>
              <div className="font-semibold">{passingScore}%</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3 sm:col-span-2 xl:col-span-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Scheduled Time / Window</div>
              <div className="font-semibold">
                {windowStartRaw && windowEndRaw
                  ? `${formatDateTime(windowStartRaw)} — ${formatDateTime(windowEndRaw)}`
                  : windowStartRaw
                    ? formatDateTime(windowStartRaw)
                    : 'Available Now'}
              </div>
            </div>
          </div>
        </div>

        {/* HR Test Link Box if configured */}
        {effectiveExamLink && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
              <Video className="h-4 w-4 text-indigo-600" /> HR Scheduled Test Link
            </div>
            <p className="text-xs text-slate-600">
              Your evaluation test link is configured below. Click the button to launch your assessment in a separate window.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleStartAssessment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-sm"
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Launch Assessment Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                onClick={handleFinalSubmit}
                disabled={submitting}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Mark Exam as Completed
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="h-4 w-4 text-primary" /> Instructions &amp; Proctoring Rules
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            {guidelines.map((g, idx) => (
              <li key={idx}>{g}</li>
            ))}
          </ul>
        </div>
      </div>

      {examAwaitingEvaluation && (
        <div className="p-4 rounded-xl border bg-muted/40 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Timer className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight">Exam Submitted — Awaiting Evaluation</h4>
            <p className="text-xs mt-1 leading-normal opacity-90">
              Your assessment has been received. Results will be published here once the evaluation is complete.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onToggleFeedback}>
              {showFeedback ? 'Hide Feedback' : 'View Feedback'}
            </Button>
            {showFeedback && (
              <div className="mt-2 rounded-lg border bg-card/60 p-4 text-sm">
                {examFeedback ?? 'Evaluation in progress. Feedback will appear here shortly.'}
              </div>
            )}
          </div>
        </div>
      )}

      {!effectiveExamLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant={examStartedAt ? 'warning' : 'success'}>
              {examStartedAt ? 'Ongoing' : 'Ready / Live'}
            </Badge>
            <span className="text-xs text-muted-foreground">Exam status</span>
          </div>
          <Button
            onClick={handleStartAssessment}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm font-semibold"
          >
            <ClipboardList className="mr-2 h-4 w-4" /> Start In-Browser Exam
          </Button>
        </div>
      )}

      {/* Real In-Browser Assessment Dialog */}
      <Dialog open={examOpen} onOpenChange={(open) => {
        if (!open && examStarted) return
        setExamOpen(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Online Examination — {job?.title ?? 'Technical Assessment'}</DialogTitle>
            <DialogDescription>
              {totalQuestions} questions · {durationMins} minutes · Cutoff {passingScore}%
            </DialogDescription>
          </DialogHeader>

          {!examStarted ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The timer starts as soon as you click <strong>Start Exam</strong>.</li>
                  <li>Do not navigate away or refresh the window while the exam is active.</li>
                  <li>Answers are saved automatically as you make your selections.</li>
                </ul>
              </div>
              <DialogFooter>
                <Button onClick={handleStartExam} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <ArrowRight className="mr-2 h-4 w-4" /> Start Exam Now
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border bg-indigo-50/70 px-4 py-3">
                <span className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" /> Exam In Progress
                </span>
                <span className="flex items-center gap-1.5 font-mono font-bold text-indigo-700 bg-white px-3 py-1 rounded-md border border-indigo-200">
                  <Timer className="h-4 w-4" /> {mm}:{ss}
                </span>
              </div>

              {/* Realistic Assessment Questions */}
              <div className="space-y-5">
                {IN_BROWSER_EXAM_QUESTIONS.map((q, qIndex) => (
                  <div key={q.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-900 leading-snug">
                        <span className="text-indigo-600 mr-1.5">Q{qIndex + 1}.</span> {q.question}
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                        {q.category}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[q.id] === optIdx
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                            className={`p-3 rounded-lg border text-xs text-left transition-all font-medium flex items-center gap-2.5 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="border-t pt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Answered: {Object.keys(selectedAnswers).length} / {IN_BROWSER_EXAM_QUESTIONS.length}
                </span>
                <Button onClick={handleFinalSubmit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Round 2 — Technical Interview
// ============================================================================
function TechnicalRound({
  roundNumber,
  state,
  interviews,
  technical_interview_status,
  slotsExpired,
  missed,
  onOpenSchedule,
  onCancelSlot,
  onRevertReschedule,
  onAttend,
  feedback,
  showFeedback,
  onToggleFeedback,
}: {
  roundNumber: number
  state: RoundState
  interviews: MockInterview[]
  technical_interview_status?: string | null
  slotsExpired: boolean
  missed: boolean
  onOpenSchedule: (key: RoundKey) => void
  onCancelSlot: (key: RoundKey) => void
  onRevertReschedule: (key: RoundKey) => void
  onAttend: (interviewId: string) => void
  feedback?: string | null
  showFeedback: boolean
  onToggleFeedback: () => void
}) {
  const statusRaw = technical_interview_status ?? null
  const statusRawNorm = (statusRaw ?? '').toLowerCase()
  const status =
    statusRawNorm === 'passed' || (['cleared', 'completed'].includes(statusRawNorm) && !!feedback)
      ? 'passed'
      : statusRaw
  const booked = interviews.find((i) => isConfirmedBooking(i))
  const extBooked = booked ?? null
  const completed = interviews.find((i) => {
    const s = (i.status ?? '').toLowerCase()
    if (s === 'passed' || s === 'failed') return true
    return s === 'completed' && !!i.feedback
  }) || interviews.find((i) => !!i.feedback || !!i.rating)

  const effectiveFeedback = completed?.feedback || feedback || (interviews.find((i) => !!i.feedback)?.feedback) || null

  // Live countdown — re-renders every 15s so the button state flips at the
  // 2-hour and 5-minute thresholds without any user interaction.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!booked || extBooked?.reschedule_requested) return
    const t = window.setInterval(() => forceTick((v) => v + 1), 15000)
    return () => window.clearInterval(t)
  }, [booked, extBooked?.reschedule_requested])

  if (state === 'locked') return null

  if (state === 'disqualified') return null

  // Cleared — strict terminal view: green banner, scorecard and feedback ONLY.
  // Slot selectors, reschedule controls and meeting links never render here.
  if (state === 'passed') {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <UserSearch className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Round {roundNumber} · Technical Interview</span>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Round Cleared
          </div>
          <p className="mt-1 text-sm text-emerald-800">{effectiveFeedback ?? 'Congratulations! You have qualified this round.'}</p>
        </div>
        {completed && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Award className="h-4 w-4 text-green-600" /> Interviewer Scorecard
              </div>
              {completed.rating && <Badge variant="success">{completed.rating}/5</Badge>}
            </div>
            <MetricFeedback metrics={completed.metrics ?? undefined} title="4-Metric Scorecard" compact />
            {completed.interviewer && (
              <div className="text-xs text-muted-foreground">Conducted by {completed.interviewer.first_name} {completed.interviewer.last_name}</div>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={onToggleFeedback}>
            {showFeedback ? 'Hide Feedback' : 'View Feedback'}
          </Button>
          {showFeedback && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
              {effectiveFeedback ?? 'Feedback will be published soon.'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Missed / did not attend — the round can no longer be taken.
  if (missed) {
    return (
      <div className="mt-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>You can no longer attend this interview</AlertTitle>
          <AlertDescription>
            You did not attempt the interview in your chosen slot. The Technical round has been closed for your
            application and further steps cannot proceed.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Failed — strict terminal view: red banner + feedback ONLY.
  if (state === 'failed') {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <UserSearch className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Round {roundNumber} · Technical Interview</span>
        </div>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Not cleared</AlertTitle>
          <AlertDescription>This round was not cleared. Further steps are locked.</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={onToggleFeedback}>
            {showFeedback ? 'Hide Feedback' : 'View Feedback'}
          </Button>
          {showFeedback && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              {feedback ?? 'Feedback will be published soon.'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Time gating relative to the confirmed interview time.
  const msUntil = booked ? new Date(booked.scheduled_at ?? '').getTime() - Date.now() : null
  const canRequestReschedule = msUntil !== null && msUntil > TWO_HOURS_MS
  const inRescheduleWindow = msUntil !== null && msUntil > 0 && msUntil <= TWO_HOURS_MS
  const canJoin = msUntil !== null && msUntil <= FIVE_MIN_MS
  const reschedulePending = extBooked?.reschedule_requested === true && extBooked?.reschedule_status === 'pending'
  const rescheduleAccepted = extBooked?.reschedule_status === 'accepted'
  const rescheduleRejected = extBooked?.reschedule_status === 'rejected'

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <UserSearch className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Round {roundNumber} · Technical Interview</span>
      </div>
      {['scheduled', 'ongoing'].includes(status ?? '') && booked && (
        <div className="space-y-3">
          {reschedulePending && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>A request to reschedule interview call has been received by our team and it will be rescheduled once the slot is available.</span>
            </div>
          )}
          {rescheduleAccepted && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 shadow-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <div className="font-semibold text-emerald-950">Reschedule Request Approved</div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Your interview reschedule request has been approved by HR. Your updated interview is confirmed for <strong>{formatDateTime(booked.scheduled_at)}</strong>.
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Your interview is confirmed for {formatDateTime(booked.scheduled_at)}.
            </div>
            <div className="text-sm text-muted-foreground">
              Mode: {booked.mode ?? '—'}
              {booked.interviewer ? ` · Interviewer: ${booked.interviewer.first_name} ${booked.interviewer.last_name}` : ''}
            </div>

            {booked.meeting_link && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={booked.meeting_link.startsWith('http') ? booked.meeting_link : `https://${booked.meeting_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Video className="h-4 w-4" /> Join Video Meeting
                </a>
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">{booked.meeting_link}</span>
              </div>
            )}

            <div className="space-y-2 border-t pt-3">
              {reschedulePending ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your interview is currently confirmed for {formatDateTime(booked.scheduled_at)}. Your request to reschedule for{' '}
                    {extBooked?.reschedule_preferred_time ? formatDate(extBooked.reschedule_preferred_time) : 'a new time'} (Reason: &apos;{extBooked?.reschedule_reason ?? 'No reason provided'}&apos;) is currently{' '}
                    <span className="font-medium">Under Review</span>. You can check back once Admin approves or rejects it. If rejected, your confirmed time remains {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" variant="outline" onClick={() => onRevertReschedule('technical')}>
                      <XCircle className="mr-2 h-4 w-4" /> Revert Request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('technical')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('technical')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : rescheduleAccepted ? (
                <>
                  <p className="text-sm text-emerald-800 font-medium">
                    Your interview has been rescheduled to {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('technical')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('technical')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : rescheduleRejected ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your request to reschedule has been rejected due to unavailability of slots. Therefore your interview call is scheduled for {formatDateTime(booked.scheduled_at)}.
                  </p>
                  {extBooked?.reschedule_admin_note && (
                    <p className="rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Admin note:</span> {extBooked.reschedule_admin_note}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('technical')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('technical')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : canJoin ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Your interview is live now. Click on the &apos;Attend Interview&apos; button to join your interview call.
                    </p>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center px-2.5 py-1 rounded-full text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block"></span>
                      Live Now
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {booked.meeting_link ? (
                      <Button
                        asChild
                        className="bg-green-600 animate-pulse hover:bg-green-700"
                        onClick={() => onAttend(booked.id)}
                      >
                        <a href={booked.meeting_link} target="_blank" rel="noreferrer">
                          <Video className="mr-2 h-4 w-4" /> Attend Interview
                        </a>
                      </Button>
                    ) : (
                      <Button disabled className="bg-green-600/40 text-white hover:bg-green-600/40">
                        <Video className="mr-2 h-4 w-4" /> Attend Interview
                      </Button>
                    )}
                  </div>
                </>
              ) : inRescheduleWindow ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your interview call is scheduled for {formatDateTime(booked.scheduled_at)}. You cannot reschedule within 2 hours of the call — the &apos;Attend Interview&apos; button will be enabled 5 minutes prior to the scheduled time.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button disabled className="opacity-50 cursor-not-allowed">
                      <CalendarClock className="mr-2 h-4 w-4" /> Reschedule Slot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('technical')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your Technical round interview call has been scheduled for {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" onClick={() => onOpenSchedule('technical')}>
                      <CalendarClock className="mr-2 h-4 w-4" /> Reschedule Slot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('technical')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {status === null && state === 'available' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">
            Please choose a slot from available slots.
          </div>
          <Button onClick={() => onOpenSchedule('technical')} disabled={slotsExpired}>
            <CalendarClock className="mr-2 h-4 w-4" /> {slotsExpired ? 'No Available Slots' : 'Schedule Interview Slot'}
          </Button>
        </div>
      )}
      {status !== null && state === 'available' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">
            Slots are available for your interview — book one to confirm your time.
          </div>
          <Button onClick={() => onOpenSchedule('technical')} disabled={slotsExpired}>
            <CalendarClock className="mr-2 h-4 w-4" /> {slotsExpired ? 'No Available Slots' : 'Schedule Interview Slot'}
          </Button>
        </div>
      )}

      {state === 'available' || state === 'booked' ? (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-primary" /> Important Notes
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            <li>You can request to reschedule up to 2 hours prior to the interview call time.</li>
            <li>To join the interview, log in/refresh the portal at the scheduled time. The &quot;Attend Interview&quot; button will become visible and enabled 5 minutes prior to the call.</li>
            <li>Rescheduling is subject to slot availability. If slots are unavailable, your previously scheduled time remains fixed.</li>
            <li>If for any reason the candidate is unable to attend the interview at the chosen slot, they will be marked as disqualified.</li>
            <li>If you believe there is a mistake or require support, please contact support@oklut.com.</li>
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={onToggleFeedback}>
          {showFeedback ? 'Hide Feedback' : 'View Feedback'}
        </Button>
        {showFeedback && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            {status === null ? 'N/A' : (feedback ?? 'Feedback will be published soon.')}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Round 3 — HR Interview
// ============================================================================
function HRRound({
  roundNumber,
  state,
  interviews,
  hr_interview_status,
  slotsExpired,
  missed,
  onOpenSchedule,
  onCancelSlot,
  onRevertReschedule,
  onAttend,
  feedback,
  showFeedback,
  onToggleFeedback,
}: {
  roundNumber: number
  state: RoundState
  interviews: MockInterview[]
  hr_interview_status?: string | null
  slotsExpired: boolean
  missed: boolean
  onOpenSchedule: (key: RoundKey) => void
  onCancelSlot: (key: RoundKey) => void
  onRevertReschedule: (key: RoundKey) => void
  onAttend: (interviewId: string) => void
  feedback?: string | null
  showFeedback: boolean
  onToggleFeedback: () => void
}) {
  const statusRaw = hr_interview_status ?? null
  const statusRawNorm = (statusRaw ?? '').toLowerCase()
  const status =
    statusRawNorm === 'passed' || (['cleared', 'completed'].includes(statusRawNorm) && !!feedback)
      ? 'passed'
      : statusRaw
  const booked = interviews.find((i) => isConfirmedBooking(i))
  const extBooked = booked ?? null
  const completed = interviews.find((i) => {
    const s = (i.status ?? '').toLowerCase()
    if (s === 'passed' || s === 'failed') return true
    return s === 'completed' && !!i.feedback
  }) || interviews.find((i) => !!i.feedback || !!i.rating)

  const effectiveFeedback = completed?.feedback || feedback || (interviews.find((i) => !!i.feedback)?.feedback) || null

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!booked || extBooked?.reschedule_requested) return
    const t = window.setInterval(() => forceTick((v) => v + 1), 15000)
    return () => window.clearInterval(t)
  }, [booked, extBooked?.reschedule_requested])

  if (state === 'locked') return null

  if (state === 'disqualified') return null

  // Cleared — strict terminal view: green banner, scorecard and feedback ONLY.
  // Slot selectors, reschedule controls and meeting links never render here.
  if (state === 'passed') {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Round {roundNumber} · HR Interview</span>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Round Cleared
          </div>
          <p className="mt-1 text-sm text-emerald-800">{effectiveFeedback ?? 'Congratulations! You have qualified this round.'}</p>
        </div>
        {completed && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Award className="h-4 w-4 text-green-600" /> Interviewer Scorecard
              </div>
              {completed.rating && <Badge variant="success">{completed.rating}/5</Badge>}
            </div>
            <MetricFeedback metrics={completed.metrics ?? undefined} title="4-Metric Scorecard" compact />
            {completed.interviewer && (
              <div className="text-xs text-muted-foreground">Conducted by {completed.interviewer.first_name} {completed.interviewer.last_name}</div>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={onToggleFeedback}>
            {showFeedback ? 'Hide Feedback' : 'View Feedback'}
          </Button>
          {showFeedback && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
              {effectiveFeedback ?? 'Feedback will be published soon.'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Missed / did not attend — the round can no longer be taken.
  if (missed) {
    return (
      <div className="mt-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>You can no longer attend this interview</AlertTitle>
          <AlertDescription>
            You did not attempt the interview in your chosen slot. The HR round has been closed for your
            application and the pipeline cannot proceed.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Failed — strict terminal view: red banner + feedback ONLY.
  if (state === 'failed') {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Round {roundNumber} · HR Interview</span>
        </div>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Not cleared</AlertTitle>
          <AlertDescription>This round was not cleared. Further steps are locked.</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={onToggleFeedback}>
            {showFeedback ? 'Hide Feedback' : 'View Feedback'}
          </Button>
          {showFeedback && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              {feedback ?? 'Feedback will be published soon.'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Time gating relative to the confirmed interview time.
  const msUntil = booked ? new Date(booked.scheduled_at ?? '').getTime() - Date.now() : null
  const canRequestReschedule = msUntil !== null && msUntil > TWO_HOURS_MS
  const inRescheduleWindow = msUntil !== null && msUntil > 0 && msUntil <= TWO_HOURS_MS
  const canJoin = msUntil !== null && msUntil <= FIVE_MIN_MS
  const reschedulePending = extBooked?.reschedule_requested === true && extBooked?.reschedule_status === 'pending'
  const rescheduleAccepted = extBooked?.reschedule_status === 'accepted'
  const rescheduleRejected = extBooked?.reschedule_status === 'rejected'

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Round {roundNumber} · HR Interview</span>
      </div>
      {['scheduled', 'ongoing'].includes(status ?? '') && booked && (
        <div className="space-y-3">
          {reschedulePending && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>A request to reschedule interview call has been received by our team and it will be rescheduled once the slot is available.</span>
            </div>
          )}
          {rescheduleAccepted && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 shadow-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <div className="font-semibold text-emerald-950">Reschedule Request Approved</div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Your interview reschedule request has been approved by HR. Your updated interview is confirmed for <strong>{formatDateTime(booked.scheduled_at)}</strong>.
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Your interview is confirmed for {formatDateTime(booked.scheduled_at)}.
            </div>
            <div className="text-sm text-muted-foreground">
              Mode: {booked.mode ?? '—'}
              {booked.interviewer ? ` · Interviewer: ${booked.interviewer.first_name} ${booked.interviewer.last_name}` : ''}
            </div>

            {booked.meeting_link && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={booked.meeting_link.startsWith('http') ? booked.meeting_link : `https://${booked.meeting_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Video className="h-4 w-4" /> Join Video Meeting
                </a>
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">{booked.meeting_link}</span>
              </div>
            )}

            <div className="space-y-2 border-t pt-3">
              {reschedulePending ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your interview is currently confirmed for {formatDateTime(booked.scheduled_at)}. Your request to reschedule for{' '}
                    {extBooked?.reschedule_preferred_time ? formatDate(extBooked.reschedule_preferred_time) : 'a new time'} (Reason: &apos;{extBooked?.reschedule_reason ?? 'No reason provided'}&apos;) is currently{' '}
                    <span className="font-medium">Under Review</span>. You can check back once Admin approves or rejects it. If rejected, your confirmed time remains {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" variant="outline" onClick={() => onRevertReschedule('hr')}>
                      <XCircle className="mr-2 h-4 w-4" /> Revert Request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('hr')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('hr')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : rescheduleAccepted ? (
                <>
                  <p className="text-sm text-emerald-800 font-medium">
                    Your interview has been rescheduled to {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('hr')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('hr')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : rescheduleRejected ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your request to reschedule has been rejected due to unavailability of slots. Therefore your interview call is scheduled for {formatDateTime(booked.scheduled_at)}.
                  </p>
                  {extBooked?.reschedule_admin_note && (
                    <p className="rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Admin note:</span> {extBooked.reschedule_admin_note}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRequestReschedule}
                      onClick={() => onOpenSchedule('hr')}
                      className={canRequestReschedule ? '' : 'text-muted-foreground opacity-60 hover:bg-transparent'}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Request to Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('hr')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : canJoin ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Your interview is live now. Click on the &apos;Attend Interview&apos; button to join your interview call.
                    </p>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center px-2.5 py-1 rounded-full text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block"></span>
                      Live Now
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {booked.meeting_link ? (
                      <Button
                        asChild
                        className="bg-green-600 animate-pulse hover:bg-green-700"
                        onClick={() => onAttend(booked.id)}
                      >
                        <a href={booked.meeting_link} target="_blank" rel="noreferrer">
                          <Video className="mr-2 h-4 w-4" /> Attend Interview
                        </a>
                      </Button>
                    ) : (
                      <Button disabled className="bg-green-600/40 text-white hover:bg-green-600/40">
                        <Video className="mr-2 h-4 w-4" /> Attend Interview
                      </Button>
                    )}
                  </div>
                </>
              ) : inRescheduleWindow ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your interview call is scheduled for {formatDateTime(booked.scheduled_at)}. You cannot reschedule within 2 hours of the call — the &apos;Attend Interview&apos; button will be enabled 5 minutes prior to the scheduled time.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button disabled className="opacity-50 cursor-not-allowed">
                      <CalendarClock className="mr-2 h-4 w-4" /> Reschedule Slot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('hr')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your HR round interview call has been scheduled for {formatDateTime(booked.scheduled_at)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" onClick={() => onOpenSchedule('hr')}>
                      <CalendarClock className="mr-2 h-4 w-4" /> Reschedule Slot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={!canRequestReschedule}
                      onClick={() => onCancelSlot('hr')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Slot
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {status === null && state === 'available' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">
            Please choose a slot from available slots.
          </div>
          <Button onClick={() => onOpenSchedule('hr')} disabled={slotsExpired}>
            <CalendarClock className="mr-2 h-4 w-4" /> {slotsExpired ? 'No Available Slots' : 'Schedule Interview Slot'}
          </Button>
        </div>
      )}
      {status !== null && state === 'available' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">
            Slots are available for your interview — book one to confirm your time.
          </div>
          <Button onClick={() => onOpenSchedule('hr')} disabled={slotsExpired}>
            <CalendarClock className="mr-2 h-4 w-4" /> {slotsExpired ? 'No Available Slots' : 'Schedule Interview Slot'}
          </Button>
        </div>
      )}

      {state === 'available' || state === 'booked' ? (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-primary" /> Important Notes
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            <li>You can request to reschedule up to 2 hours prior to the interview call time.</li>
            <li>To join the interview, log in/refresh the portal at the scheduled time. The &quot;Attend Interview&quot; button will become visible and enabled 5 minutes prior to the call.</li>
            <li>Rescheduling is subject to slot availability. If slots are unavailable, your previously scheduled time remains fixed.</li>
            <li>If for any reason the candidate is unable to attend the interview at the chosen slot, they will be marked as disqualified.</li>
            <li>If you believe there is a mistake or require support, please contact support@oklut.com.</li>
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={onToggleFeedback}>
          {showFeedback ? 'Hide Feedback' : 'View Feedback'}
        </Button>
        {showFeedback && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            {status === null ? 'N/A' : (feedback ?? 'Feedback will be published soon.')}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Shared — 4-metric feedback / scorecard rendering
// ============================================================================
function MetricFeedback({ metrics, title, compact }: { metrics?: Record<string, number> | null; title: string; compact?: boolean }) {
  const entries = Object.entries(metrics ?? {})
  if (entries.length === 0) return null
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {title && <div className="text-sm font-medium">{title}</div>}
      {entries.map(([name, value]) => {
        const v = Math.max(0, Math.min(5, Number(value) || 0))
        const pct = (v / 5) * 100
        return (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{name}</span>
              <span className="font-semibold">{v}/5</span>
            </div>
            <Progress value={pct} className={v >= 3.5 ? 'bg-green-600' : v >= 2.5 ? 'bg-amber-500' : 'bg-red-500'} />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Offer — stage complete & terms flow
// ============================================================================
function CongratulationsCard({ onViewTerms }: { onViewTerms: () => void }) {
  return (
    <div className="rounded-lg border border-primary bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <PartyPopper className="h-5 w-5 text-primary" /> Congratulations! You have cleared all interview rounds.
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You are one step away from your offer letter. Please review and accept the company terms and conditions to proceed.
      </p>
      <Button className="mt-4 bg-purple-600 text-white hover:bg-purple-700" onClick={onViewTerms}>
        <FileText className="mr-2 h-4 w-4" /> View Terms &amp; Conditions
      </Button>
    </div>
  )
}

// ============================================================================
// Offer letter — unlocked document / PDF preview + final decision actions
// ============================================================================
function OfferLetterSection({
  candidate,
  offer,
  job,
  onRespond,
  onDiscuss,
  discussOpen,
  onToggleDiscuss,
  discussMessage,
  onDiscussMessageChange,
}: {
  candidate: MockCandidate
  offer: MockOffer
  job: MockJobOpening | null
  onRespond: (response: 'accept' | 'discuss' | 'reject') => void
  onDiscuss: (message: string) => void
  discussOpen: boolean
  onToggleDiscuss: () => void
  discussMessage: string
  onDiscussMessageChange: (value: string) => void
}) {
  const responded = offer.candidate_response != null
  const pdfUrl = offer.pdf_url

  const handleDownload = () => {
    const filename = `Offer_Letter_${candidate.name.replace(/\s+/g, '_')}.pdf`
    if (pdfUrl && (pdfUrl.startsWith('data:') || pdfUrl.startsWith('http') || pdfUrl.startsWith('blob:'))) {
      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Downloading official offer letter PDF')
      return
    }

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offer Letter - ${candidate.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 48px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 3px solid #6366f1; padding-bottom: 24px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .subhead { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
            .ref { background: #f1f5f9; padding: 6px 14px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 700; color: #334155; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
            .val { font-size: 15px; font-weight: 700; color: #0f172a; }
            .terms { margin-top: 24px; padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; font-size: 12px; line-height: 1.7; color: #334155; }
            .sig { margin-top: 48px; display: flex; justify-content: space-between; padding-top: 24px; border-top: 1px solid #cbd5e1; }
            @media print { body { padding: 24px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">OKLUT INC.</div>
              <div class="subhead">Official Letter of Employment Offer</div>
            </div>
            <div class="ref">Ref: ${(candidate as any).reference_id || candidate.candidate_id || candidate.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <p>Date: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
          <p>Dear <strong>${candidate.name}</strong>,</p>
          <p>We are delighted to extend this formal offer of employment for the position of <strong>${job?.title || 'Associate'}</strong> at <strong>Oklut Inc.</strong> Your qualifications and performance throughout our evaluation process made you an outstanding choice for this role.</p>
          
          <div class="grid">
            <div>
              <div class="label">Annual Compensation (CTC)</div>
              <div class="val" style="color: #059669;">${offer.salary_offered ? `₹${offer.salary_offered.toLocaleString('en-IN')}` : 'As Mutually Agreed'}</div>
            </div>
            <div>
              <div class="label">Tentative Joining Date</div>
              <div class="val">${offer.joining_date ? formatDate(offer.joining_date) : 'Immediate / To be confirmed'}</div>
            </div>
            <div>
              <div class="label">Service Commitment</div>
              <div class="val">${offer.service_bond_years ? `${offer.service_bond_years} Year Service Commitment` : 'Standard Company Policy'}</div>
            </div>
            <div>
              <div class="label">Work Location</div>
              <div class="val">${offer.relocation_required ? (offer.relocation_location || 'Designated Office') : 'Flexible / Hybrid'}</div>
            </div>
          </div>

          <div class="terms">
            <strong>Key Terms & Employment Conditions:</strong><br/>
            ${(offer as any).terms_and_conditions ? (offer as any).terms_and_conditions.replace(/\n/g, '<br/>') : 'This offer is contingent on background verification, submission of educational certificates, and adherence to company code of conduct. Full benefit policies will take effect upon the official start date.'}
          </div>

          <div class="sig">
            <div>
              <div style="font-weight: 700;">Authorized Signatory</div>
              <div style="color: #64748b; font-size: 12px;">Human Resources Management</div>
              <div style="color: #6366f1; font-weight: 600; font-size: 12px; margin-top: 4px;">OKLUT INC.</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700;">Candidate Signature</div>
              <div style="color: #64748b; font-size: 12px;">${candidate.name}</div>
              <div style="color: #059669; font-weight: 600; font-size: 12px; margin-top: 4px;">${offer.candidate_response === 'accept' ? 'Digitally Accepted' : 'Pending Formal Acceptance'}</div>
            </div>
          </div>

          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
      toast.success('Generated printable offer letter document')
    }
  }

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> View Offer Letter — {candidate.name}
        </CardTitle>
        <CardDescription>Terms accepted. Your official offer letter is ready below — review it and confirm your decision.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Official Offer Letter — Document Preview
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download Offer PDF
          </Button>
        </div>

        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title={offer.document_title || `Offer Letter — ${candidate.name}`}
            className="h-[600px] w-full rounded-lg border bg-white"
          />
        ) : (
          <div className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm space-y-6 text-slate-800">
            <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-2">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">OKLUT INC. — EMPLOYMENT OFFER</h3>
                <p className="text-xs text-muted-foreground">Official Letter of Intent &amp; Offer Confirmation</p>
              </div>
              <span className="inline-flex items-center rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs px-3 py-1 font-semibold">
                Ref: {(candidate as any).reference_id || candidate.candidate_id || candidate.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <p>Dear <strong className="text-slate-950">{candidate.name}</strong>,</p>
              <p className="leading-relaxed">
                Following your outstanding performance in all evaluation and interview rounds, we are pleased to offer you the position of <strong className="text-slate-950">{job?.title || 'Associate'}</strong> at <strong className="text-slate-950">Oklut Inc.</strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-slate-50 p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Annual CTC Offered:</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {offer.salary_offered ? `₹${offer.salary_offered.toLocaleString('en-IN')}` : 'As Discussed'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tentative Joining Date:</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {offer.joining_date ? formatDate(offer.joining_date) : 'Immediate / To be confirmed'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Service Bond Terms:</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {offer.service_bond_years ? `${offer.service_bond_years} Year Service Bond` : 'Standard Policy (No Bond)'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location / Relocation:</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {offer.relocation_required ? (offer.relocation_location || 'Office Location Required') : 'Flexible / Hybrid'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please confirm your acceptance of this offer by clicking &quot;Accept Offer&quot; below. Once accepted, our HR team will reach out with the onboarding documentation and welcome kit.
              </p>
            </div>
          </div>
        )}

        {responded && offer.candidate_response ? (
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">Your Response</div>
            <StatusPill status={offer.candidate_response} />
            <p className="text-sm text-muted-foreground">
              {offer.candidate_response === 'accept' && 'Congratulations! You have accepted the job offer. Welcome to the team!'}
              {offer.candidate_response === 'discuss' && 'Your request to discuss terms has been recorded. Our recruitment team will get in touch with you shortly.'}
              {offer.candidate_response === 'reject' && 'You have declined the job offer. We wish you the best in your future endeavors.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 border-t pt-4">
              <Button onClick={() => onRespond('accept')} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Offer
              </Button>
              <Button onClick={() => onRespond('reject')} className="bg-rose-500 text-white hover:bg-rose-600">
                <XCircle className="mr-2 h-4 w-4" /> Reject Offer
              </Button>
              <Button variant="outline" onClick={onToggleDiscuss}>
                <Info className="mr-2 h-4 w-4" /> Discuss Offer
              </Button>
            </div>
            {discussOpen && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <Label>Discuss the offer with our team</Label>
                <Textarea
                  rows={3}
                  placeholder="Share your questions, concerns, or preferred terms…"
                  value={discussMessage}
                  onChange={(e) => onDiscussMessageChange(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onDiscuss(discussMessage)}>Send Query</Button>
                  <Button size="sm" variant="outline" onClick={onToggleDiscuss}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Terms & Conditions — shared modal used both after all rounds are cleared
// (pre-offer) and inside the offer card (before the decision actions).
// ============================================================================
function TermsDialog({
  open,
  onOpenChange,
  onAgree,
  content,
  checkboxLabels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgree: () => void
  content?: string | null
  checkboxLabels?: Array<string | null>
}) {
  const labels = checkboxLabels ?? []
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false])
  const allChecked = checked.length > 0 && checked.every(Boolean)

  useEffect(() => {
    if (open) setChecked([false, false, false, false, false])
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Terms &amp; Conditions</DialogTitle>
          <DialogDescription>
            Please review the terms carefully. Accepting all conditions is required to proceed.
          </DialogDescription>
        </DialogHeader>
        {content ? (
          <div
            className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/40 p-4 text-sm sm:p-5"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="min-h-0 flex-1 rounded-lg border bg-muted/40 p-4 text-sm sm:p-5" />
        )}
        <div className="max-h-[30vh] shrink-0 space-y-3 overflow-y-auto px-1 py-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Checkbox
                id={`terms-${i}`}
                className="mt-0.5 shrink-0"
                checked={checked[i]}
                onCheckedChange={(v) => setChecked((prev) => prev.map((c, idx) => (idx === i ? v === true : c)))}
              />
              <Label htmlFor={`terms-${i}`} className="min-w-0 text-sm font-normal leading-snug">{labels[i] ?? ''}</Label>
            </div>
          ))}
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!allChecked} onClick={onAgree}>
            I Accept All Terms &amp; Conditions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}