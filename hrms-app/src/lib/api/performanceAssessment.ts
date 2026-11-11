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

/**
 * Automatically classifies an employee or candidate into 'IT' or 'NON_IT'
 * based on their designation, role, department, and employee code.
 */
export function getEmployeeCategory(employee: any): TrackType {
  if (!employee) return 'IT'

  const desigName = (
    (employee.designation?.name ||
      employee.designation?.title ||
      employee.role ||
      employee.title ||
      '') as string
  ).toLowerCase()

  const deptName = (employee.department?.name || '').toLowerCase()
  const deptCode = (employee.department?.code || '').toLowerCase()
  const roleName = ((employee.role?.name || employee.role_id || '') as string).toLowerCase()
  const empCode = (employee.employee_code || '').toLowerCase()

  // 1. Explicit IT keywords in designation
  const itDesigKeywords = [
    'software', 'developer', 'engineer', 'frontend', 'backend', 'full stack', 'fullstack',
    'devops', 'cloud', 'qa', 'quality assurance', 'tester', 'test', 'architect', 'data engineer',
    'data scientist', 'machine learning', 'ai engineer', 'cyber', 'security engineer', 'network',
    'system admin', 'sysadmin', 'database', 'dba', 'programmer', 'coder', 'tech lead', 'technical',
    'sap', 'salesforce', 'ui/ux', 'ui designer', 'ux designer', 'web developer', 'it support',
    'solution architect', 'lead engineer', 'consultant', 'tech'
  ]

  // 2. Explicit Non-IT keywords in designation
  const nonItDesigKeywords = [
    'hr', 'human resource', 'recruiter', 'talent', 'sales', 'business development', 'bde',
    'marketing', 'content', 'copywriter', 'seo', 'finance', 'accountant', 'accounts',
    'auditor', 'operations', 'admin', 'administrative', 'office manager', 'facility', 'legal',
    'counselor', 'executive assistant', 'receptionist', 'customer care', 'customer service',
    'customer support', 'payroll', 'billing', 'financial', 'clerk', 'cashier'
  ]

  // Priority 1: Check designation
  if (itDesigKeywords.some((k) => desigName.includes(k))) return 'IT'
  if (nonItDesigKeywords.some((k) => desigName.includes(k))) return 'NON_IT'

  // Priority 2: Check department
  const itDeptKeywords = [
    'tech', 'it', 'information technology', 'software', 'eng', 'engineering', 'development',
    'dev', 'infra', 'infrastructure', 'cyber', 'security', 'rnd', 'r&d', 'data', 'qa', 'design'
  ]
  const nonItDeptKeywords = [
    'hr', 'human resource', 'sales', 'marketing', 'fin', 'finance', 'account', 'ops',
    'operation', 'operations', 'admin', 'administration', 'legal', 'support', 'business'
  ]

  if (itDeptKeywords.some((k) => deptName.includes(k) || deptCode.includes(k))) return 'IT'
  if (nonItDeptKeywords.some((k) => deptName.includes(k) || deptCode.includes(k))) return 'NON_IT'

  // Priority 3: Employee code (e.g. OKL-TECH-..., OKL-ENG-..., OKL-SAL-..., OKL-HR-...)
  if (empCode.includes('tech') || empCode.includes('eng') || empCode.includes('dev') || empCode.includes('it')) return 'IT'
  if (empCode.includes('sal') || empCode.includes('hr') || empCode.includes('mkt') || empCode.includes('fin') || empCode.includes('ops')) return 'NON_IT'

  // Priority 4: Role
  if (roleName.includes('hr') || roleName.includes('recruiter')) return 'NON_IT'

  return 'IT'
}

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

function mapDbToAssessment(row: any, fallbackKey: string): EmployeeAssessment {
  return {
    id: row.id || fallbackKey,
    employeeId: row.employee_id,
    employeeName: row.employee_name || 'Employee',
    employeeCode: row.employee_code || 'EMP',
    role: row.role || 'Software Engineer',
    department: row.department || 'Technology',
    track: (row.track as TrackType) || 'IT',
    reviewPeriod: row.review_period,
    status: row.status || 'draft',
    items: Array.isArray(row.items) ? row.items : [],
    totalGoalsReached: row.total_goals_reached || 0,
    totalGoalsCount: row.total_goals_count || 14,
    overallScore: row.overall_score != null ? Number(row.overall_score) : undefined,
    overallPercentage: row.overall_percentage != null ? Number(row.overall_percentage) : undefined,
    performanceBand: row.performance_band || undefined,
    reviewerId: row.reviewer_id || undefined,
    reviewerName: row.reviewer_name || undefined,
    reviewerFeedback: row.reviewer_feedback || undefined,
    submittedAt: row.submitted_at || undefined,
    reviewedAt: row.reviewed_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

export function createSampleCandidateAssessment(
  employeeId: string = '00000000-0000-0000-0000-000000000020',
  employeeName: string = 'Meera Sharma',
  employeeCode: string = 'EMP-0002',
  track: TrackType = 'IT',
  period: string = 'Q4 2026'
): EmployeeAssessment {
  const key = buildAssessmentId(employeeId, track, period)
  const template = getTemplateForTrack(track)

  const sampleResponses: Record<number, { comment: string; evidence: string }> = {
    1: {
      comment: 'Enforced TypeScript strict mode and clean architecture. Conducted 18 peer code reviews with zero SonarQube blocker issues.',
      evidence: 'PR #142, PR #168, PR #189 (GitHub)',
    },
    2: {
      comment: 'Delivered all sprint commitments for Sprint 18 to 24 with 98% on-time velocity and zero scope spillover.',
      evidence: 'JIRA Sprint Burndown & Velocity Dashboard',
    },
    3: {
      comment: 'Diagnosed and fixed real-time WebSocket memory leak in attendance notification service, reducing client disconnects by 42%.',
      evidence: 'Bug ticket PROD-1092 & Post-mortem doc',
    },
    4: {
      comment: 'Coordinated actively across frontend and backend squads. Mentored 2 junior engineers during onboarding.',
      evidence: 'Slack #eng-frontend & Confluence KT Notes',
    },
    5: {
      comment: 'Completed TanStack Query v5 and Tailwind CSS component architecture training and implemented optimistic cache updates.',
      evidence: 'Certificate ID: TSTK-84920',
    },
    6: {
      comment: 'Took end-to-end responsibility for the Payslip PDF & Barcode generator feature from requirements to deployment.',
      evidence: 'Feature Epic FEAT-301 in JIRA',
    },
    7: {
      comment: 'Maintained zero P1/P2 production regressions across all 6 releases this quarter with automated test gates.',
      evidence: 'QA Release Sign-off Reports',
    },
    8: {
      comment: 'Implemented security hardening on authentication sessions and input sanitization across candidate forms.',
      evidence: 'Security Audit SARIF Report',
    },
    9: {
      comment: 'Wrote unit and integration test suites achieving 88% branch coverage on core payroll and attendance calculators.',
      evidence: 'Vitest Coverage Report (88.4%)',
    },
    10: {
      comment: 'Proposed and implemented client-side state caching reducing redundant API queries by 35%.',
      evidence: 'Architecture RFC-04 in Confluence',
    },
    11: {
      comment: 'Documented all public API contracts, component props and deployment steps in markdown docs.',
      evidence: 'docs/api-and-interface-design.md',
    },
  }

  const items = template.map((item) => {
    const sample = sampleResponses[item.id]
    if (sample) {
      return {
        ...item,
        goalReached: true,
        selfRating: 4,
        employeeComment: sample.comment,
        evidenceSource: sample.evidence,
        reviewerComment: '',
        reviewerRating: undefined,
        weightedScore: 0,
      }
    }
    return {
      ...item,
      goalReached: false,
      selfRating: undefined,
      employeeComment: '',
      evidenceSource: '',
      reviewerComment: '',
      reviewerRating: undefined,
      weightedScore: 0,
    }
  })

  const metrics = calculateAssessmentMetrics(items)

  return {
    id: key,
    employeeId,
    employeeName,
    employeeCode,
    role: track === 'IT' ? 'Software Engineer' : 'Operations Specialist',
    department: track === 'IT' ? 'Information Technology' : 'Operations',
    track,
    reviewPeriod: period,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    items,
    totalGoalsReached: metrics.totalGoalsReached,
    totalGoalsCount: metrics.totalGoalsCount,
    overallScore: metrics.overallScore,
    overallPercentage: metrics.overallPercentage,
    performanceBand: metrics.performanceBand,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
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

  // Pre-seed sample candidate submission for Meera Sharma so HR immediately sees a submitted assessment with checked goals and comments
  if (
    employeeId === '00000000-0000-0000-0000-000000000020' ||
    employeeDetails?.code === 'EMP-0002' ||
    (employeeDetails?.name && employeeDetails.name.toLowerCase().includes('meera'))
  ) {
    const sample = createSampleCandidateAssessment(
      employeeId,
      employeeDetails?.name || 'Meera Sharma',
      employeeDetails?.code || 'EMP-0002',
      track,
      period
    )
    store[key] = sample
    persistAssessments(store)
    return sample
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

export async function fetchEmployeeAssessmentRemote(
  employeeId: string,
  track: TrackType = 'IT',
  period: string = 'Q4 2026',
  employeeDetails?: { name?: string | null; code?: string | null; role?: string | null; department?: string | null }
): Promise<EmployeeAssessment> {
  const key = buildAssessmentId(employeeId, track, period)
  const store = getStoredAssessments()

  // 1. Try Supabase remote table first
  try {
    if (employeeId) {
      const { data, error } = await supabase
        .from('employee_assessments')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('review_period', period)
        .maybeSingle()

      if (!error && data && data.items && Array.isArray(data.items) && data.items.length > 0) {
        const remote = mapDbToAssessment(data, key)
        store[key] = remote
        persistAssessments(store)
        return remote
      }
    }
  } catch (err) {
    console.warn('Failed to fetch remote assessment from Supabase:', err)
  }

  // 2. Return local storage if present
  if (store[key]) {
    return store[key]
  }

  // 3. Fallback to template or sample
  return getEmployeeAssessment(employeeId, track, period, employeeDetails)
}

export async function fetchAllEmployeeAssessmentsRemote(): Promise<EmployeeAssessment[]> {
  try {
    const { data, error } = await supabase
      .from('employee_assessments')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data && data.length > 0) {
      const store = getStoredAssessments()
      const remoteList = data.map((row: any) => {
        const key = buildAssessmentId(row.employee_id, row.track || 'IT', row.review_period)
        const mapped = mapDbToAssessment(row, key)
        store[key] = mapped
        return mapped
      })
      persistAssessments(store)
      return remoteList
    }
  } catch (err) {
    console.warn('Failed to fetch all remote employee assessments:', err)
  }

  // Ensure sample for Meera Sharma exists in store
  const meeraKey = buildAssessmentId('00000000-0000-0000-0000-000000000020', 'IT', 'Q4 2026')
  const store = getStoredAssessments()
  if (!store[meeraKey]) {
    store[meeraKey] = createSampleCandidateAssessment()
    persistAssessments(store)
  }

  return Object.values(store)
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

  try {
    if (assessment.employeeId) {
      await supabase.from('employee_assessments').upsert({
        id: assessment.id,
        employee_id: assessment.employeeId,
        employee_name: assessment.employeeName,
        employee_code: assessment.employeeCode,
        role: assessment.role,
        department: assessment.department,
        track: assessment.track,
        review_period: assessment.reviewPeriod,
        status: 'draft',
        items: assessment.items as any,
        total_goals_reached: metrics.totalGoalsReached,
        total_goals_count: metrics.totalGoalsCount,
        overall_score: metrics.overallScore,
        overall_percentage: metrics.overallPercentage,
        performance_band: metrics.performanceBand,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,review_period' })
    }
  } catch (err) {
    console.warn('Supabase assessment draft save notice:', err)
  }

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

  // Direct Supabase employee_assessments persistence
  try {
    if (assessment.employeeId) {
      await supabase.from('employee_assessments').upsert({
        id: assessment.id,
        employee_id: assessment.employeeId,
        employee_name: assessment.employeeName,
        employee_code: assessment.employeeCode,
        role: assessment.role,
        department: assessment.department,
        track: assessment.track,
        review_period: assessment.reviewPeriod,
        status: 'submitted',
        items: assessment.items as any,
        total_goals_reached: metrics.totalGoalsReached,
        total_goals_count: metrics.totalGoalsCount,
        overall_score: metrics.overallScore,
        overall_percentage: metrics.overallPercentage,
        performance_band: metrics.performanceBand,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,review_period' })
    }
  } catch (err) {
    console.warn('Supabase assessment submit notice:', err)
  }

  // Sync with Supabase performance_reviews table (upsert or update existing)
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assessment.employeeId)
    if (isUuid) {
      const { data: existingRev } = await supabase
        .from('performance_reviews')
        .select('id')
        .eq('employee_id', assessment.employeeId)
        .eq('period', assessment.reviewPeriod)
        .maybeSingle()

      if (existingRev?.id) {
        await supabase
          .from('performance_reviews')
          .update({
            status: 'submitted',
            goals: `Assessment Sheet (${assessment.track}): ${metrics.totalGoalsReached}/${metrics.totalGoalsCount} goals reached (${metrics.reachedWeight}%)`,
            comments: `Candidate self-assessment submitted with ${metrics.totalGoalsReached} reached goals.`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRev.id)
      } else {
        await supabase
          .from('performance_reviews')
          .insert({
            employee_id: assessment.employeeId,
            period: assessment.reviewPeriod,
            goals: `Assessment Sheet (${assessment.track}): ${metrics.totalGoalsReached}/${metrics.totalGoalsCount} goals reached (${metrics.reachedWeight}%)`,
            status: 'submitted',
            comments: `Candidate self-assessment submitted with ${metrics.totalGoalsReached} reached goals.`,
          })
      }
    }
  } catch (err) {
    console.warn('Supabase performance review sync notice:', err)
  }

  // Create organization notification for HR and CEO review
  try {
    await supabase.from('notifications').insert({
      title: 'Performance Review Submitted',
      message: `${assessment.employeeName} (${assessment.employeeCode}) has submitted their ${assessment.reviewPeriod} Performance Review (${assessment.track} Track) awaiting evaluation.`,
      type: 'info',
      link: '/performance',
    })
  } catch {}

  // Dispatch global event for live tab updates
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hrms_review_submitted', { detail: updated }))
    }
  } catch {}

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

  // Direct Supabase employee_assessments persistence for reviewed status
  try {
    if (assessment.employeeId) {
      await supabase.from('employee_assessments').upsert({
        id: assessment.id,
        employee_id: assessment.employeeId,
        employee_name: assessment.employeeName,
        employee_code: assessment.employeeCode,
        role: assessment.role,
        department: assessment.department,
        track: assessment.track,
        review_period: assessment.reviewPeriod,
        status: 'reviewed',
        items: assessment.items as any,
        total_goals_reached: metrics.totalGoalsReached,
        total_goals_count: metrics.totalGoalsCount,
        overall_score: metrics.overallScore,
        overall_percentage: metrics.overallPercentage,
        performance_band: metrics.performanceBand,
        reviewer_id: reviewerId || null,
        reviewer_name: reviewerName || 'HR Reviewer',
        reviewer_feedback: reviewerFeedback || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,review_period' })
    }
  } catch (err) {
    console.warn('Supabase assessment reviewed save notice:', err)
  }

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
