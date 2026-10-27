import { supabase } from '@/lib/supabase'

export type TrackType = 'IT' | 'NON_IT'

export interface AssessmentItem {
  id: number
  successFactor: string
  assessmentQuestion: string
  weight: number // e.g. 10 for 10%
  targetStandard: string
  measurementEvidence: string
  goalReached: boolean // Checkbox checked by candidate/employee
  selfRating?: number // 1 to 5
  employeeComment?: string
  evidenceSource?: string
  reviewerComment?: string
  reviewerRating?: number // 1 to 5 given by HR/Manager
  weightedScore?: number // (reviewerRating * weight) / 100
}

export interface EmployeeAssessment {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  role: string
  department: string
  track: TrackType
  reviewPeriod: string
  status: 'draft' | 'submitted' | 'reviewed'
  items: AssessmentItem[]
  totalGoalsReached: number
  totalGoalsCount: number
  overallScore?: number
  overallPercentage?: number
  performanceBand?: string
  reviewerId?: string
  reviewerName?: string
  reviewerFeedback?: string
  submittedAt?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export const IT_ASSESSMENT_TEMPLATE: Omit<AssessmentItem, 'goalReached'>[] = [
  {
    id: 1,
    successFactor: 'Code Quality & Best Practices',
    assessmentQuestion: 'How do you ensure quality, maintainability, security and coding standards?',
    weight: 10,
    targetStandard: 'Standards followed; low rework',
    measurementEvidence: 'Code reviews, static analysis, defect/rework %',
  },
  {
    id: 2,
    successFactor: 'Delivery & Productivity',
    assessmentQuestion: 'Did you meet sprint/release commitments? What caused any variance?',
    weight: 10,
    targetStandard: 'Committed work delivered on time',
    measurementEvidence: 'JIRA/Azure DevOps, sprint completion, cycle time',
  },
  {
    id: 3,
    successFactor: 'Problem Solving & Innovation',
    assessmentQuestion: 'Describe a complex problem you solved and its impact.',
    weight: 10,
    targetStandard: 'Effective root-cause analysis and solution',
    measurementEvidence: 'Incidents resolved, automation, improvements',
  },
  {
    id: 4,
    successFactor: 'Collaboration & Communication',
    assessmentQuestion: 'How effectively do you work with team members and stakeholders?',
    weight: 10,
    targetStandard: 'Clear communication and teamwork',
    measurementEvidence: '360 feedback, stakeholder feedback',
  },
  {
    id: 5,
    successFactor: 'Learning & Growth',
    assessmentQuestion: 'What new skills, tools or technologies did you learn and apply?',
    weight: 5,
    targetStandard: 'Continuous role-relevant learning',
    measurementEvidence: 'Training, certifications, POCs, skills applied',
  },
  {
    id: 6,
    successFactor: 'Ownership & Accountability',
    assessmentQuestion: 'How do you demonstrate ownership from initiation through closure?',
    weight: 10,
    targetStandard: 'Proactive ownership with minimal follow-up',
    measurementEvidence: 'Task closure, escalations, rework',
  },
  {
    id: 7,
    successFactor: 'Quality / Defect Management',
    assessmentQuestion: 'How do you prevent, identify and resolve defects/issues?',
    weight: 10,
    targetStandard: 'Proactive quality and root-cause focus',
    measurementEvidence: 'Defect leakage, severity trend, escaped defects',
  },
  {
    id: 8,
    successFactor: 'Process Improvement',
    assessmentQuestion: 'What process improvements have you proposed or implemented?',
    weight: 5,
    targetStandard: 'Measurable efficiency or quality improvement',
    measurementEvidence: 'Time saved, error/cycle-time reduction',
  },
  {
    id: 9,
    successFactor: 'Customer / Business Impact',
    assessmentQuestion: 'How does your work contribute to customer or business outcomes?',
    weight: 10,
    targetStandard: 'Work aligned with business priorities',
    measurementEvidence: 'CSAT, stakeholder feedback, business KPIs',
  },
  {
    id: 10,
    successFactor: 'Risk & Compliance',
    assessmentQuestion: 'How do you identify, communicate and mitigate project or compliance risks?',
    weight: 5,
    targetStandard: 'Risks identified early and handled',
    measurementEvidence: 'Risk register, audit/security findings',
  },
  {
    id: 11,
    successFactor: 'Leadership / Mentoring',
    assessmentQuestion: 'How do you support teammates and knowledge development?',
    weight: 5,
    targetStandard: 'Knowledge sharing and mentoring where applicable',
    measurementEvidence: 'KT sessions, mentoring records, team feedback',
  },
  {
    id: 12,
    successFactor: 'Initiative Beyond Role',
    assessmentQuestion: 'What initiatives did you take beyond assigned tasks?',
    weight: 5,
    targetStandard: 'Proactive contribution with measurable value',
    measurementEvidence: 'POCs, automation, cross-team initiatives',
  },
  {
    id: 13,
    successFactor: 'Stakeholder Management',
    assessmentQuestion: 'How do you manage expectations, escalations and competing priorities?',
    weight: 5,
    targetStandard: 'Timely and transparent communication',
    measurementEvidence: 'Feedback, escalation resolution',
  },
  {
    id: 14,
    successFactor: 'Documentation',
    assessmentQuestion: 'Is all required douments are preparied on devloping the project',
    weight: 5,
    targetStandard: 'Timely prepare the Documents like BRD, FRDs',
    measurementEvidence: 'Documents need to preparied and review, which will be useful to the team',
  },
]

export const NON_IT_ASSESSMENT_TEMPLATE: Omit<AssessmentItem, 'goalReached'>[] = [
  {
    id: 1,
    successFactor: 'Business / Functional Knowledge',
    assessmentQuestion: 'How well do you understand your business process, products, customers and responsibilities?',
    weight: 8,
    targetStandard: 'Strong knowledge applied independently',
    measurementEvidence: 'Accuracy, stakeholder feedback, knowledge checks',
  },
  {
    id: 2,
    successFactor: 'Goal & Target Achievement',
    assessmentQuestion: 'Did you achieve agreed business goals, KPIs and deliverables?',
    weight: 12,
    targetStandard: 'Agreed targets achieved or appropriately managed',
    measurementEvidence: 'KPI achievement %, target variance',
  },
  {
    id: 3,
    successFactor: 'Quality & Accuracy',
    assessmentQuestion: 'How do you ensure accuracy, completeness and quality?',
    weight: 10,
    targetStandard: 'Low error and rework rate',
    measurementEvidence: 'Error %, rework %, audit findings',
  },
  {
    id: 4,
    successFactor: 'Productivity & Timeliness',
    assessmentQuestion: 'How effectively do you prioritize and complete work within timelines?',
    weight: 8,
    targetStandard: 'Work completed within SLA/deadline',
    measurementEvidence: 'SLA adherence, turnaround time, productivity',
  },
  {
    id: 5,
    successFactor: 'Customer / Stakeholder Management',
    assessmentQuestion: 'How effectively do you manage customer and stakeholder expectations?',
    weight: 8,
    targetStandard: 'Timely, clear and professional engagement',
    measurementEvidence: 'CSAT, stakeholder feedback, escalations',
  },
  {
    id: 6,
    successFactor: 'Problem Solving & Decision Making',
    assessmentQuestion: 'Describe a difficult business problem you solved and the decision made.',
    weight: 8,
    targetStandard: 'Structured analysis and practical decisions',
    measurementEvidence: 'Issues resolved, root-cause analysis',
  },
  {
    id: 7,
    successFactor: 'Process Improvement',
    assessmentQuestion: 'What process improvement or efficiency initiative did you introduce?',
    weight: 8,
    targetStandard: 'Measurable time, cost, quality or risk improvement',
    measurementEvidence: 'Time saved, cost/error reduction',
  },
  {
    id: 8,
    successFactor: 'Digital Markets / Business Performance',
    assessmentQuestion: 'How do you contribute to digital channel growth, market performance or business outcomes?',
    weight: 8,
    targetStandard: 'Contribution aligned with digital/business goals',
    measurementEvidence: 'Revenue, conversion, engagement, ROI',
  },
  {
    id: 9,
    successFactor: 'Analytics & Data-driven Decisions',
    assessmentQuestion: 'How do you use data, dashboards or analysis to support decisions?',
    weight: 8,
    targetStandard: 'Decisions supported by accurate insights',
    measurementEvidence: 'Insight adoption, forecast accuracy, KPI trends',
  },
  {
    id: 10,
    successFactor: 'Risk, Controls & Compliance',
    assessmentQuestion: 'How do you identify, report and manage operational, financial or regulatory risks?',
    weight: 6,
    targetStandard: 'Controls followed; risks escalated appropriately',
    measurementEvidence: 'Control adherence, audit findings, risk closure',
  },
  {
    id: 11,
    successFactor: 'Collaboration & Teamwork',
    assessmentQuestion: 'How effectively do you collaborate across business and support teams?',
    weight: 6,
    targetStandard: 'Constructive cross-functional collaboration',
    measurementEvidence: '360 feedback, dependency management',
  },
  {
    id: 12,
    successFactor: 'Learning & Development',
    assessmentQuestion: 'What new business, digital, analytics or professional skills did you develop?',
    weight: 5,
    targetStandard: 'Continuous role-relevant development',
    measurementEvidence: 'Training, certifications, skills applied',
  },
  {
    id: 13,
    successFactor: 'Ownership & Accountability',
    assessmentQuestion: 'How do you demonstrate ownership for outcomes rather than only tasks?',
    weight: 6,
    targetStandard: 'Proactive follow-through and accountability',
    measurementEvidence: 'Closure rate, escalation handling',
  },
  {
    id: 14,
    successFactor: 'Leadership / Mentoring',
    assessmentQuestion: 'How do you support colleagues, share knowledge and develop team capability?',
    weight: 5,
    targetStandard: 'Mentoring and knowledge sharing where applicable',
    measurementEvidence: 'Mentoring records, KT sessions, feedback',
  },
]

export function getTemplateForTrack(track: TrackType): AssessmentItem[] {
  const source = track === 'IT' ? IT_ASSESSMENT_TEMPLATE : NON_IT_ASSESSMENT_TEMPLATE
  return source.map((item) => ({
    ...item,
    goalReached: false,
    selfRating: undefined,
    employeeComment: '',
    evidenceSource: '',
    reviewerComment: '',
    reviewerRating: undefined,
    weightedScore: 0,
  }))
}

export function calculateAssessmentMetrics(items: AssessmentItem[]): {
  totalGoalsReached: number
  totalGoalsCount: number
  reachedWeight: number
  overallScore: number
  overallPercentage: number
  performanceBand: string
} {
  const totalGoalsCount = items.length
  const totalGoalsReached = items.filter((i) => i.goalReached).length
  const totalPossibleWeight = items.reduce((acc, curr) => acc + curr.weight, 0) || 100
  const reachedWeightRaw = items.filter((i) => i.goalReached).reduce((acc, curr) => acc + curr.weight, 0)
  const reachedWeight = Math.min(100, Math.round((reachedWeightRaw / totalPossibleWeight) * 100))

  // Weighted score calculation normalized by total weight
  let totalWeightedScore = 0
  let ratedWeightSum = 0

  for (const item of items) {
    const rating = item.reviewerRating ?? item.selfRating
    if (rating && rating > 0) {
      const itemScore = (rating * item.weight) / totalPossibleWeight
      item.weightedScore = Number(((rating * item.weight) / 100).toFixed(2))
      totalWeightedScore += itemScore
      ratedWeightSum += item.weight
    } else {
      item.weightedScore = 0
    }
  }

  const overallScore = Number(totalWeightedScore.toFixed(2))
  const overallPercentage = Math.min(100, Math.round((overallScore / 5) * 100))

  let performanceBand = 'Needs Assessment'
  if (ratedWeightSum > 0) {
    if (overallScore >= 4.5) performanceBand = 'Outstanding (4.5 - 5.0)'
    else if (overallScore >= 3.8) performanceBand = 'Exceeds Expectations (3.8 - 4.4)'
    else if (overallScore >= 3.0) performanceBand = 'Meets Expectations (3.0 - 3.7)'
    else if (overallScore >= 2.0) performanceBand = 'Needs Improvement (2.0 - 2.9)'
    else performanceBand = 'Unsatisfactory (< 2.0)'
  }

  return {
    totalGoalsReached,
    totalGoalsCount,
    reachedWeight,
    overallScore,
    overallPercentage,
    performanceBand,
  }
}

const STORAGE_KEY = 'hrms_performance_assessments_v1'

function getStoredAssessments(): Record<string, EmployeeAssessment> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to parse stored assessments:', err)
  }
  return {}
}

function persistAssessments(data: Record<string, EmployeeAssessment>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('Failed to persist assessments to localStorage:', err)
  }
}

export function buildAssessmentId(employeeId: string, track: TrackType, period: string): string {
  return `${employeeId}_${track}_${period}`
}

export function getEmployeeAssessment(
  employeeId: string,
  track: TrackType = 'IT',
  period: string = 'Q4 2026',
  employeeDetails?: { name?: string | null; code?: string | null; role?: string | null; department?: string | null }
): EmployeeAssessment {
  const store = getStoredAssessments()
  const key = buildAssessmentId(employeeId, track, period)

  if (store[key]) {
    return store[key]
  }

  // Create new blank assessment
  const items = getTemplateForTrack(track)
  const metrics = calculateAssessmentMetrics(items)

  const newAssessment: EmployeeAssessment = {
    id: key,
    employeeId,
    employeeName: employeeDetails?.name || 'Employee',
    employeeCode: employeeDetails?.code || 'EMP',
    role: employeeDetails?.role || (track === 'IT' ? 'Software Engineer' : 'Business Specialist'),
    department: employeeDetails?.department || (track === 'IT' ? 'Technology' : 'Operations'),
    track,
    reviewPeriod: period,
    status: 'draft',
    items,
    totalGoalsReached: metrics.totalGoalsReached,
    totalGoalsCount: metrics.totalGoalsCount,
    overallScore: metrics.overallScore,
    overallPercentage: metrics.overallPercentage,
    performanceBand: metrics.performanceBand,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store[key] = newAssessment
  persistAssessments(store)
  return newAssessment
}

export function getAllEmployeeAssessments(): EmployeeAssessment[] {
  const store = getStoredAssessments()
  return Object.values(store)
}

export async function saveAssessmentDraft(assessment: EmployeeAssessment): Promise<EmployeeAssessment> {
  const metrics = calculateAssessmentMetrics(assessment.items)
  const updated: EmployeeAssessment = {
    ...assessment,
    totalGoalsReached: metrics.totalGoalsReached,
    totalGoalsCount: metrics.totalGoalsCount,
    overallScore: metrics.overallScore,
    overallPercentage: metrics.overallPercentage,
    performanceBand: metrics.performanceBand,
    updatedAt: new Date().toISOString(),
  }

  const store = getStoredAssessments()
  store[updated.id] = updated
  persistAssessments(store)
  return updated
}

export async function submitAssessmentForReview(assessment: EmployeeAssessment): Promise<EmployeeAssessment> {
  const metrics = calculateAssessmentMetrics(assessment.items)
  const updated: EmployeeAssessment = {
    ...assessment,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    totalGoalsReached: metrics.totalGoalsReached,
    totalGoalsCount: metrics.totalGoalsCount,
    overallScore: metrics.overallScore,
    overallPercentage: metrics.overallPercentage,
    performanceBand: metrics.performanceBand,
    updatedAt: new Date().toISOString(),
  }

  const store = getStoredAssessments()
  store[updated.id] = updated
  persistAssessments(store)

  // Try sync with supabase performance_reviews if possible
  try {
    await supabase.from('performance_reviews').insert({
      employee_id: assessment.employeeId,
      period: assessment.reviewPeriod,
      goals: `Assessment Sheet (${assessment.track}): ${metrics.totalGoalsReached}/${metrics.totalGoalsCount} goals reached (${metrics.reachedWeight}%)`,
      status: 'submitted',
      comments: `Candidate self-assessment submitted with ${metrics.totalGoalsReached} reached goals.`,
    })
  } catch (err) {
    console.warn('Optional Supabase performance review sync skipped:', err)
  }

  return updated
}

export async function submitReviewerGrading(
  assessment: EmployeeAssessment,
  reviewerId?: string,
  reviewerName?: string,
  reviewerFeedback?: string
): Promise<EmployeeAssessment> {
  const metrics = calculateAssessmentMetrics(assessment.items)
  const updated: EmployeeAssessment = {
    ...assessment,
    status: 'reviewed',
    reviewerId: reviewerId || assessment.reviewerId,
    reviewerName: reviewerName || assessment.reviewerName || 'HR Reviewer',
    reviewerFeedback: reviewerFeedback ?? assessment.reviewerFeedback,
    reviewedAt: new Date().toISOString(),
    totalGoalsReached: metrics.totalGoalsReached,
    totalGoalsCount: metrics.totalGoalsCount,
    overallScore: metrics.overallScore,
    overallPercentage: metrics.overallPercentage,
    performanceBand: metrics.performanceBand,
    updatedAt: new Date().toISOString(),
  }

  const store = getStoredAssessments()
  store[updated.id] = updated
  persistAssessments(store)

  // Sync finalized rating to supabase performance_reviews
  try {
    await supabase.from('performance_reviews').insert({
      employee_id: assessment.employeeId,
      period: assessment.reviewPeriod,
      rating: metrics.overallScore,
      goals: `Assessment Sheet (${assessment.track}): ${metrics.totalGoalsReached}/${metrics.totalGoalsCount} goals reached.`,
      comments: reviewerFeedback || `HR Review Complete. Score: ${metrics.overallScore}/5.0 (${metrics.overallPercentage}%). Band: ${metrics.performanceBand}`,
      status: 'acknowledged',
      reviewer_id: reviewerId,
      review_date: new Date().toISOString().slice(0, 10),
    })
  } catch (err) {
    console.warn('Optional Supabase performance review rating sync skipped:', err)
  }

  return updated
}
