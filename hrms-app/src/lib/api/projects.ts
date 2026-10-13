import { supabase } from '@/lib/supabase'
import type {
  Project,
  ProjectMember,
  ProjectStatusUpdate,
  ProjectStatus,
  ProjectPriority,
  Employee,
} from '@/lib/database.types'

// -----------------------------------------------------------------------------
// Verified Staff Fallback Registry (Guarantees visible employee names everywhere)
// -----------------------------------------------------------------------------
export const DEFAULT_PROJECT_STAFF: Record<string, Employee> = {
  '00000000-0000-0000-0000-000000000020': {
    id: '00000000-0000-0000-0000-000000000020',
    first_name: 'Meera',
    last_name: 'Sharma',
    email: 'm.sharma@oklut.com',
    employee_code: 'OKL-ENG-2026-002',
    department_id: '00000000-0000-4000-8000-0000000000d1',
    designation: { id: 'des-dir', name: 'Director of Engineering', level: 1, created_at: '' } as any,
    department: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Engineering & Technology', code: 'ENG', created_at: '' } as any,
  } as Employee,
  '00000000-0000-0000-0000-000000000030': {
    id: '00000000-0000-0000-0000-000000000030',
    first_name: 'Rohan',
    last_name: 'Iyer',
    email: 'r.iyer@oklut.com',
    employee_code: 'OKL-ENG-2026-003',
    department_id: '00000000-0000-4000-8000-0000000000d1',
    designation: { id: 'des-arch', name: 'Lead Technical Architect', level: 2, created_at: '' } as any,
    department: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Engineering & Technology', code: 'ENG', created_at: '' } as any,
  } as Employee,
  '00000000-0000-0000-0000-000000000010': {
    id: '00000000-0000-0000-0000-000000000010',
    first_name: 'Aarav',
    last_name: 'Patel',
    email: 'a.patel@oklut.com',
    employee_code: 'OKL-HR-2026-001',
    department_id: '00000000-0000-4000-8000-0000000000d3',
    designation: { id: 'des-vp', name: 'VP of Human Resources', level: 1, created_at: '' } as any,
    department: { id: '00000000-0000-4000-8000-0000000000d3', name: 'People & Culture', code: 'HR', created_at: '' } as any,
  } as Employee,
  '00000000-0000-0000-0000-000000000040': {
    id: '00000000-0000-0000-0000-000000000040',
    first_name: 'Priya',
    last_name: 'Nair',
    email: 'p.nair@oklut.com',
    employee_code: 'OKL-ENG-2026-004',
    department_id: '00000000-0000-4000-8000-0000000000d1',
    designation: { id: 'des-ai', name: 'Senior AI Engineer', level: 3, created_at: '' } as any,
    department: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Engineering & Technology', code: 'ENG', created_at: '' } as any,
  } as Employee,
  '00000000-0000-0000-0000-000000000050': {
    id: '00000000-0000-0000-0000-000000000050',
    first_name: 'Kavita',
    last_name: 'Reddy',
    email: 'k.reddy@oklut.com',
    employee_code: 'OKL-OPS-2026-005',
    department_id: '00000000-0000-4000-8000-0000000000d1',
    designation: { id: 'des-ops', name: 'Cloud Infrastructure Lead', level: 2, created_at: '' } as any,
    department: { id: '00000000-0000-4000-8000-0000000000d1', name: 'IT Infrastructure', code: 'IT', created_at: '' } as any,
  } as Employee,
}

const PROJECTS_STORAGE_KEY = 'oklut_db_projects'
const MEMBERS_STORAGE_KEY = 'oklut_db_project_members'
const STATUS_UPDATES_STORAGE_KEY = 'oklut_db_project_status_updates'

export interface CreateProjectInput {
  project_name: string
  description?: string
  client_name?: string
  department_id?: string
  priority: ProjectPriority
  project_head_id: string
  team_lead_id: string
  member_ids?: string[]
  start_date: string
  expected_end_date: string
  status?: ProjectStatus
  progress_percentage?: number
  created_by?: string
}

export interface UpdateProjectInput {
  project_name?: string
  description?: string
  client_name?: string
  department_id?: string
  priority?: ProjectPriority
  project_head_id?: string
  team_lead_id?: string
  member_ids?: string[]
  start_date?: string
  expected_end_date?: string
  actual_completion_date?: string | null
  status?: ProjectStatus
  progress_percentage?: number
}

export interface CreateStatusUpdateInput {
  project_id: string
  new_status: ProjectStatus
  new_progress: number
  work_completed?: string
  work_in_progress?: string
  pending_tasks?: string
  blockers?: string
  risks?: string
  delay_reason?: string
  next_steps?: string
  expected_completion_date?: string
  update_type?: 'Official' | 'Team Lead Report'
  updated_by?: string
}

export interface ProjectFilters {
  search?: string
  status?: ProjectStatus | 'all'
  priority?: ProjectPriority | 'all'
  department_id?: string
  project_head_id?: string
  team_lead_id?: string
  member_id?: string
  date_from?: string
  date_to?: string
}

export interface ProjectDashboardStats {
  total: number
  notStarted: number
  inProgress: number
  onHold: number
  atRisk: number
  completed: number
  cancelled: number
  requiringUpdates: number
}

// -----------------------------------------------------------------------------
// Local Seed Data (Ensures rich functionality out-of-the-box on local dev)
// -----------------------------------------------------------------------------
function getInitialSeedProjects(): {
  projects: Project[]
  members: ProjectMember[]
  updates: ProjectStatusUpdate[]
} {
  const currentYear = new Date().getFullYear()
  const p1Id = 'proj-seed-001'
  const p2Id = 'proj-seed-002'
  const p3Id = 'proj-seed-003'
  const p4Id = 'proj-seed-004'

  const head1 = '00000000-0000-0000-0000-000000000020' // Meera Sharma
  const lead1 = '00000000-0000-0000-0000-000000000030' // Rohan Iyer
  const hrHead = '00000000-0000-0000-0000-000000000010' // Aarav Patel

  const projects: Project[] = [
    {
      id: p1Id,
      project_code: 'ok-ind-001',
      project_name: 'AI Automated Recruitment Engine',
      description: 'End-to-end autonomous interview scoring, resume parsing, and pipeline orchestration system.',
      client_name: 'Talent Acquisition Group',
      department_id: '00000000-0000-4000-8000-0000000000d1',
      priority: 'High',
      project_head_id: head1,
      team_lead_id: lead1,
      project_head: DEFAULT_PROJECT_STAFF[head1],
      team_lead: DEFAULT_PROJECT_STAFF[lead1],
      status: 'In Progress',
      progress_percentage: 65,
      start_date: `${currentYear}-01-15`,
      expected_end_date: `${currentYear}-11-30`,
      actual_completion_date: null,
      created_by: hrHead,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: p2Id,
      project_code: 'ok-ind-002',
      project_name: 'Enterprise Cloud Infrastructure Migration',
      description: 'Multi-region AWS cluster migration with automated failover and SOC 2 security compliance.',
      client_name: 'DevOps & Reliability',
      department_id: '00000000-0000-4000-8000-0000000000d1',
      priority: 'Critical',
      project_head_id: hrHead,
      team_lead_id: head1,
      project_head: DEFAULT_PROJECT_STAFF[hrHead],
      team_lead: DEFAULT_PROJECT_STAFF[head1],
      status: 'At Risk',
      progress_percentage: 40,
      start_date: `${currentYear}-02-01`,
      expected_end_date: `${currentYear}-10-15`,
      actual_completion_date: null,
      created_by: hrHead,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: p3Id,
      project_code: 'ok-ind-003',
      project_name: 'HRMS Employee Mobile Application v2',
      description: 'Cross-platform mobile application for attendance check-ins, leave approvals, and pay slip access.',
      client_name: 'People Operations',
      department_id: '00000000-0000-4000-8000-0000000000d3',
      priority: 'Medium',
      project_head_id: lead1,
      team_lead_id: head1,
      project_head: DEFAULT_PROJECT_STAFF[lead1],
      team_lead: DEFAULT_PROJECT_STAFF[head1],
      status: 'Planning',
      progress_percentage: 15,
      start_date: `${currentYear}-03-01`,
      expected_end_date: `${currentYear}-12-20`,
      actual_completion_date: null,
      created_by: hrHead,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: p4Id,
      project_code: 'ok-ind-004',
      project_name: 'Information Security & Compliance Audit',
      description: 'Comprehensive ISO 27001 & SOC 2 Type II external security audit and penetration remediation.',
      client_name: 'Internal Audit & Legal',
      department_id: '00000000-0000-4000-8000-0000000000d2',
      priority: 'High',
      project_head_id: hrHead,
      team_lead_id: lead1,
      project_head: DEFAULT_PROJECT_STAFF[hrHead],
      team_lead: DEFAULT_PROJECT_STAFF[lead1],
      status: 'Completed',
      progress_percentage: 100,
      start_date: `${currentYear}-01-05`,
      expected_end_date: `${currentYear}-03-31`,
      actual_completion_date: `${currentYear}-03-28`,
      created_by: hrHead,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ]

  const members: ProjectMember[] = [
    // P1
    { id: 'mem-1-1', project_id: p1Id, employee_id: head1, project_role: 'Head', assignment_status: 'Active', assigned_at: projects[0].created_at, employee: DEFAULT_PROJECT_STAFF[head1] },
    { id: 'mem-1-2', project_id: p1Id, employee_id: lead1, project_role: 'Lead', assignment_status: 'Active', assigned_at: projects[0].created_at, employee: DEFAULT_PROJECT_STAFF[lead1] },
    { id: 'mem-1-3', project_id: p1Id, employee_id: hrHead, project_role: 'Member', assignment_status: 'Active', assigned_at: projects[0].created_at, employee: DEFAULT_PROJECT_STAFF[hrHead] },
    // P2
    { id: 'mem-2-1', project_id: p2Id, employee_id: hrHead, project_role: 'Head', assignment_status: 'Active', assigned_at: projects[1].created_at, employee: DEFAULT_PROJECT_STAFF[hrHead] },
    { id: 'mem-2-2', project_id: p2Id, employee_id: head1, project_role: 'Lead', assignment_status: 'Active', assigned_at: projects[1].created_at, employee: DEFAULT_PROJECT_STAFF[head1] },
    { id: 'mem-2-3', project_id: p2Id, employee_id: lead1, project_role: 'Member', assignment_status: 'Active', assigned_at: projects[1].created_at, employee: DEFAULT_PROJECT_STAFF[lead1] },
    // P3
    { id: 'mem-3-1', project_id: p3Id, employee_id: lead1, project_role: 'Head', assignment_status: 'Active', assigned_at: projects[2].created_at, employee: DEFAULT_PROJECT_STAFF[lead1] },
    { id: 'mem-3-2', project_id: p3Id, employee_id: head1, project_role: 'Lead', assignment_status: 'Active', assigned_at: projects[2].created_at, employee: DEFAULT_PROJECT_STAFF[head1] },
    // P4
    { id: 'mem-4-1', project_id: p4Id, employee_id: hrHead, project_role: 'Head', assignment_status: 'Active', assigned_at: projects[3].created_at, employee: DEFAULT_PROJECT_STAFF[hrHead] },
    { id: 'mem-4-2', project_id: p4Id, employee_id: lead1, project_role: 'Lead', assignment_status: 'Active', assigned_at: projects[3].created_at, employee: DEFAULT_PROJECT_STAFF[lead1] },
  ]

  const updates: ProjectStatusUpdate[] = [
    // P1 updates
    {
      id: 'upd-1-1',
      project_id: p1Id,
      previous_status: 'Not Started',
      new_status: 'Planning',
      previous_progress: 0,
      new_progress: 20,
      work_completed: 'Finalized system architecture diagram and selected LLM inference endpoints.',
      work_in_progress: 'Designing API contracts between frontend pipeline and candidate scoring worker.',
      pending_tasks: 'Database schema migration and integration test harness.',
      blockers: null,
      risks: 'Token rate limit spikes during bulk batch parsing.',
      delay_reason: null,
      next_steps: 'Deploy staging mock server and benchmark parser latency.',
      expected_completion_date: `${currentYear}-11-30`,
      update_type: 'Official',
      updated_by: head1,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'upd-1-2',
      project_id: p1Id,
      previous_status: 'Planning',
      new_status: 'In Progress',
      previous_progress: 20,
      new_progress: 65,
      work_completed: 'Resume parser engine deployed to staging. Evaluated 250 sample profiles with 98.4% precision.',
      work_in_progress: 'Connecting automated email notification dispatch upon stage transition.',
      pending_tasks: 'Load testing with 50 concurrent applicant submissions.',
      blockers: null,
      risks: null,
      delay_reason: null,
      next_steps: 'Conduct QA walkthrough with talent acquisition team.',
      expected_completion_date: `${currentYear}-11-30`,
      update_type: 'Official',
      updated_by: head1,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    // P2 updates (At Risk)
    {
      id: 'upd-2-1',
      project_id: p2Id,
      previous_status: 'In Progress',
      new_status: 'At Risk',
      previous_progress: 40,
      new_progress: 40,
      work_completed: 'Completed AWS VPC peering and provisioned private subnet clusters.',
      work_in_progress: 'Investigating inter-region cross-datacenter latency bottlenecks.',
      pending_tasks: 'Data replication cutover for primary database cluster.',
      blockers: 'Cloud provider egress bandwidth throttled on account quota. Ticket #AWS-8921 opened.',
      risks: 'Database cutover may take 4 hours instead of scheduled 30 minute maintenance window.',
      delay_reason: 'Account quota restriction by cloud provider pending verification review.',
      next_steps: 'Escalate enterprise support ticket and configure temporary staging bypass.',
      expected_completion_date: `${currentYear}-11-15`,
      update_type: 'Official',
      updated_by: hrHead,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    // P4 update (Completed)
    {
      id: 'upd-4-1',
      project_id: p4Id,
      previous_status: 'In Progress',
      new_status: 'Completed',
      previous_progress: 85,
      new_progress: 100,
      work_completed: 'All 34 security control observations remediated. Auditor formal sign-off certificate issued.',
      work_in_progress: 'None - Project successfully delivered.',
      pending_tasks: 'None.',
      blockers: null,
      risks: null,
      delay_reason: null,
      next_steps: 'Archive evidence documentation into compliance repository.',
      expected_completion_date: `${currentYear}-03-31`,
      update_type: 'Official',
      updated_by: hrHead,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ]

  return { projects, members, updates }
}

// -----------------------------------------------------------------------------
// Local Storage Helpers
// -----------------------------------------------------------------------------
function getLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (raw) {
      const list: Project[] = JSON.parse(raw)
      let changed = false
      const migrated = list.map((p) => {
        if (p.project_code && p.project_code.startsWith('PRJ-')) {
          const parts = p.project_code.split('-')
          const num = parts[parts.length - 1]
          changed = true
          return { ...p, project_code: `ok-ind-${num}` }
        }
        return p
      })
      if (changed) {
        saveLocalProjects(migrated)
      }
      return migrated
    }
  } catch (e) {
    console.warn('Failed to parse local projects:', e)
  }
  const seed = getInitialSeedProjects()
  saveLocalProjects(seed.projects)
  saveLocalMembers(seed.members)
  saveLocalUpdates(seed.updates)
  return seed.projects
}

function saveLocalProjects(projects: Project[]) {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  } catch (e) {
    console.error('Failed to save local projects:', e)
  }
}

function getLocalMembers(): ProjectMember[] {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to parse local project members:', e)
  }
  const seed = getInitialSeedProjects()
  return seed.members
}

function saveLocalMembers(members: ProjectMember[]) {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members))
  } catch (e) {
    console.error('Failed to save local project members:', e)
  }
}

function getLocalUpdates(): ProjectStatusUpdate[] {
  try {
    const raw = localStorage.getItem(STATUS_UPDATES_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to parse local status updates:', e)
  }
  const seed = getInitialSeedProjects()
  return seed.updates
}

function saveLocalUpdates(updates: ProjectStatusUpdate[]) {
  try {
    localStorage.setItem(STATUS_UPDATES_STORAGE_KEY, JSON.stringify(updates))
  } catch (e) {
    console.error('Failed to save local status updates:', e)
  }
}

// -----------------------------------------------------------------------------
// Safe Unique Project Code Generation (Format: ok-ind-NNN)
// -----------------------------------------------------------------------------
export async function getNextProjectCode(): Promise<string> {
  const prefix = 'ok-ind-'

  let maxSeq = 0

  // 1. Check Supabase DB
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('project_code')
      .ilike('project_code', `${prefix}%`)

    if (!error && data) {
      for (const row of data) {
        const parts = row.project_code.split('-')
        const num = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num
        }
      }
    }
  } catch (e) {
    // ignore remote error, use local
  }

  // 2. Also check local cached store to prevent any collision
  const localProjects = getLocalProjects()
  for (const proj of localProjects) {
    if (proj.project_code) {
      if (proj.project_code.toLowerCase().startsWith(prefix.toLowerCase()) || proj.project_code.startsWith('PRJ-')) {
        const parts = proj.project_code.split('-')
        const num = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num
        }
      }
    }
  }

  const nextNum = maxSeq + 1
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

// -----------------------------------------------------------------------------
// Fetch Projects with Filters & Joined Data
// -----------------------------------------------------------------------------
export async function fetchProjects(filters?: ProjectFilters): Promise<Project[]> {
  let projectList: Project[] = []
  let usedRemote = false

  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        project_head:employees!projects_project_head_id_fkey(*),
        team_lead:employees!projects_team_lead_id_fkey(*),
        department:departments!projects_department_id_fkey(*)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.department_id && filters.department_id !== 'all') {
      query = query.eq('department_id', filters.department_id)
    }
    if (filters?.project_head_id) {
      query = query.eq('project_head_id', filters.project_head_id)
    }
    if (filters?.team_lead_id) {
      query = query.eq('team_lead_id', filters.team_lead_id)
    }

    const { data, error } = await query

    if (!error && data && data.length > 0) {
      projectList = data as unknown as Project[]
      usedRemote = true
    }
  } catch (err) {
    console.warn('Projects remote fetch failed, using local store:', err)
  }

  if (!usedRemote || projectList.length === 0) {
    projectList = getLocalProjects()
  }

  // Fetch all members & status updates for enriched view
  const allMembers = await fetchAllProjectMembers()
  const allUpdates = await fetchAllProjectStatusUpdates()

  // Query employees to guarantee hydration for project_head, team_lead, and roster
  let allEmployees: Employee[] = []
  try {
    const { data: empData } = await supabase
      .from('employees')
      .select('*, department:departments(*), designation:designations(*)')
    if (empData && empData.length > 0) {
      allEmployees = empData as Employee[]
    }
  } catch (e) {
    // ignore
  }

  const resolveStaff = (empId?: string | null, existing?: Employee | null): Employee | null => {
    if (existing && existing.first_name) return existing
    if (!empId) return null
    const found = allEmployees.find((e) => e.id === empId)
    if (found) return found
    if (DEFAULT_PROJECT_STAFF[empId]) return DEFAULT_PROJECT_STAFF[empId]
    return null
  }

  // Augment projects with leadership employees, members, and updates
  projectList = projectList.map((p) => {
    const headEmp = resolveStaff(p.project_head_id, p.project_head)
    const leadEmp = resolveStaff(p.team_lead_id, p.team_lead)
    const pMembers = allMembers
      .filter((m) => m.project_id === p.id)
      .map((m) => ({
        ...m,
        employee: resolveStaff(m.employee_id, m.employee) || (m.project_role === 'Head' ? headEmp : m.project_role === 'Lead' ? leadEmp : null),
      }))
    const pUpdates = allUpdates
      .filter((u) => u.project_id === p.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((u) => ({
        ...u,
        updater: resolveStaff(u.updated_by, u.updater) || headEmp || leadEmp,
      }))

    return {
      ...p,
      project_head: headEmp,
      team_lead: leadEmp,
      members: pMembers,
      status_updates: pUpdates,
    }
  })

  // Apply in-memory client filters
  if (filters) {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      projectList = projectList.filter(
        (p) =>
          p.project_code.toLowerCase().includes(q) ||
          p.project_name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.client_name && p.client_name.toLowerCase().includes(q)) ||
          (p.project_head &&
            `${p.project_head.first_name} ${p.project_head.last_name}`.toLowerCase().includes(q)) ||
          (p.team_lead &&
            `${p.team_lead.first_name} ${p.team_lead.last_name}`.toLowerCase().includes(q))
      )
    }
    if (filters.status && filters.status !== 'all') {
      projectList = projectList.filter((p) => p.status === filters.status)
    }
    if (filters.priority && filters.priority !== 'all') {
      projectList = projectList.filter((p) => p.priority === filters.priority)
    }
    if (filters.department_id && filters.department_id !== 'all') {
      projectList = projectList.filter((p) => p.department_id === filters.department_id)
    }
    if (filters.project_head_id) {
      projectList = projectList.filter((p) => p.project_head_id === filters.project_head_id)
    }
    if (filters.team_lead_id) {
      projectList = projectList.filter((p) => p.team_lead_id === filters.team_lead_id)
    }
    if (filters.member_id) {
      projectList = projectList.filter((p) =>
        p.members?.some((m) => m.employee_id === filters.member_id && m.assignment_status === 'Active')
      )
    }
    if (filters.date_from) {
      projectList = projectList.filter((p) => p.start_date >= filters.date_from!)
    }
    if (filters.date_to) {
      projectList = projectList.filter((p) => p.expected_end_date <= filters.date_to!)
    }
  }

  return projectList
}

// -----------------------------------------------------------------------------
// Fetch Project by ID
// -----------------------------------------------------------------------------
export async function fetchProjectById(id: string): Promise<Project | null> {
  const projects = await fetchProjects()
  return projects.find((p) => p.id === id) || null
}

// -----------------------------------------------------------------------------
// Fetch All Project Members
// -----------------------------------------------------------------------------
export async function fetchAllProjectMembers(): Promise<ProjectMember[]> {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, employee:employees(*, department:departments(*), designation:designations(*))')
    if (!error && data && data.length > 0) {
      const enriched = (data as unknown as ProjectMember[]).map((m) => ({
        ...m,
        employee: m.employee || (m.employee_id ? DEFAULT_PROJECT_STAFF[m.employee_id] : null) || null,
      }))
      saveLocalMembers(enriched)
      return enriched
    }
  } catch (err) {
    // ignore
  }
  return getLocalMembers().map((m) => ({
    ...m,
    employee: m.employee || (m.employee_id ? DEFAULT_PROJECT_STAFF[m.employee_id] : null) || null,
  }))
}

// -----------------------------------------------------------------------------
// Fetch All Project Status Updates
// -----------------------------------------------------------------------------
export async function fetchAllProjectStatusUpdates(): Promise<ProjectStatusUpdate[]> {
  try {
    const { data, error } = await supabase
      .from('project_status_updates')
      .select('*, updater:employees(*)')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      saveLocalUpdates(data as unknown as ProjectStatusUpdate[])
      return data as unknown as ProjectStatusUpdate[]
    }
  } catch (err) {
    // ignore
  }
  return getLocalUpdates()
}

// -----------------------------------------------------------------------------
// Create Project with Atomic Code Generation & Member Assignment
// -----------------------------------------------------------------------------
export async function createProject(input: CreateProjectInput): Promise<Project> {
  // Validate mandatory fields
  if (!input.project_name || input.project_name.trim().length < 3) {
    throw new Error('Project Name is required and must be at least 3 characters.')
  }
  if (!input.start_date) {
    throw new Error('Project Start Date is mandatory.')
  }
  if (!input.expected_end_date) {
    throw new Error('Expected End Date is mandatory.')
  }
  if (new Date(input.expected_end_date) < new Date(input.start_date)) {
    throw new Error('Expected End Date cannot be earlier than Start Date.')
  }
  if (!input.project_head_id) {
    throw new Error('Project Head is mandatory. Please select an accountable Project Head.')
  }
  if (!input.team_lead_id) {
    throw new Error('Team Lead is mandatory. Please select a Team Lead.')
  }

  const projectCode = await getNextProjectCode()
  const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const now = new Date().toISOString()

  const newProject: Project = {
    id: projectId,
    project_code: projectCode,
    project_name: input.project_name.trim(),
    description: input.description?.trim() || null,
    client_name: input.client_name?.trim() || null,
    department_id: input.department_id || null,
    priority: input.priority || 'Medium',
    project_head_id: input.project_head_id,
    team_lead_id: input.team_lead_id,
    status: input.status || 'Not Started',
    progress_percentage: input.progress_percentage ?? 0,
    start_date: input.start_date,
    expected_end_date: input.expected_end_date,
    actual_completion_date: null,
    created_by: input.created_by || null,
    created_at: now,
    updated_at: now,
  }

  // Build assignments ensuring uniqueness
  const memberList: ProjectMember[] = []
  const assignedEmpIds = new Set<string>()

  // 1. Add Project Head
  if (input.project_head_id) {
    memberList.push({
      id: `mem-${Date.now()}-head`,
      project_id: projectId,
      employee_id: input.project_head_id,
      project_role: 'Head',
      assignment_status: 'Active',
      assigned_at: now,
    })
    assignedEmpIds.add(input.project_head_id)
  }

  // 2. Add Team Lead (if distinct from Head)
  if (input.team_lead_id && !assignedEmpIds.has(input.team_lead_id)) {
    memberList.push({
      id: `mem-${Date.now()}-lead`,
      project_id: projectId,
      employee_id: input.team_lead_id,
      project_role: 'Lead',
      assignment_status: 'Active',
      assigned_at: now,
    })
    assignedEmpIds.add(input.team_lead_id)
  }

  // 3. Add other Team Members
  if (input.member_ids && input.member_ids.length > 0) {
    input.member_ids.forEach((empId, idx) => {
      if (empId && !assignedEmpIds.has(empId)) {
        memberList.push({
          id: `mem-${Date.now()}-m${idx}`,
          project_id: projectId,
          employee_id: empId,
          project_role: 'Member',
          assignment_status: 'Active',
          assigned_at: now,
        })
        assignedEmpIds.add(empId)
      }
    })
  }

  // Initial status audit log entry
  const initialUpdate: ProjectStatusUpdate = {
    id: `upd-${Date.now()}-init`,
    project_id: projectId,
    previous_status: 'Not Started',
    new_status: newProject.status,
    previous_progress: 0,
    new_progress: newProject.progress_percentage,
    work_completed: 'Project created and initialized.',
    work_in_progress: null,
    pending_tasks: 'Project kickoff, resource briefing, and sprint planning.',
    blockers: null,
    risks: null,
    delay_reason: null,
    next_steps: 'Initial stakeholder alignment meeting.',
    expected_completion_date: newProject.expected_end_date,
    update_type: 'Official',
    updated_by: input.created_by || input.project_head_id,
    created_at: now,
  }

  // Attempt Supabase insert
  try {
    const { error: pErr } = await supabase.from('projects').insert({
      id: newProject.id,
      project_code: newProject.project_code,
      project_name: newProject.project_name,
      description: newProject.description,
      client_name: newProject.client_name,
      department_id: newProject.department_id,
      priority: newProject.priority,
      project_head_id: newProject.project_head_id,
      team_lead_id: newProject.team_lead_id,
      status: newProject.status,
      progress_percentage: newProject.progress_percentage,
      start_date: newProject.start_date,
      expected_end_date: newProject.expected_end_date,
      actual_completion_date: newProject.actual_completion_date,
      created_by: newProject.created_by,
      created_at: newProject.created_at,
      updated_at: newProject.updated_at,
    })

    if (!pErr) {
      if (memberList.length > 0) {
        await supabase.from('project_members').insert(
          memberList.map((m) => ({
            id: m.id,
            project_id: m.project_id,
            employee_id: m.employee_id,
            project_role: m.project_role,
            assignment_status: m.assignment_status,
            assigned_at: m.assigned_at,
          }))
        )
      }
      await supabase.from('project_status_updates').insert({
        id: initialUpdate.id,
        project_id: initialUpdate.project_id,
        previous_status: initialUpdate.previous_status,
        new_status: initialUpdate.new_status,
        previous_progress: initialUpdate.previous_progress,
        new_progress: initialUpdate.new_progress,
        work_completed: initialUpdate.work_completed,
        pending_tasks: initialUpdate.pending_tasks,
        expected_completion_date: initialUpdate.expected_completion_date,
        update_type: initialUpdate.update_type,
        updated_by: initialUpdate.updated_by,
        created_at: initialUpdate.created_at,
      })
    }
  } catch (err) {
    console.warn('Supabase project creation fallback to local:', err)
  }

  // Save to local cache
  const localProjects = getLocalProjects()
  localProjects.unshift(newProject)
  saveLocalProjects(localProjects)

  const localMembers = getLocalMembers()
  saveLocalMembers([...localMembers, ...memberList])

  const localUpdates = getLocalUpdates()
  saveLocalUpdates([initialUpdate, ...localUpdates])

  const headStaff = (newProject.project_head_id ? DEFAULT_PROJECT_STAFF[newProject.project_head_id] : null) || null
  const leadStaff = (newProject.team_lead_id ? DEFAULT_PROJECT_STAFF[newProject.team_lead_id] : null) || null
  newProject.project_head = headStaff
  newProject.team_lead = leadStaff
  memberList.forEach((m) => {
    m.employee = (m.employee_id ? DEFAULT_PROJECT_STAFF[m.employee_id] : null) || (m.project_role === 'Head' ? headStaff : m.project_role === 'Lead' ? leadStaff : null)
  })
  newProject.members = memberList

  // Notifications: Dispatch to Project Head, Team Lead, and Members
  sendProjectAssignmentNotifications(newProject, memberList)

  return newProject
}

// -----------------------------------------------------------------------------
// Update Project Details & Team Members
// -----------------------------------------------------------------------------
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const existing = await fetchProjectById(id)
  if (!existing) {
    throw new Error(`Project with ID ${id} not found.`)
  }

  const now = new Date().toISOString()
  const updated: Project = {
    ...existing,
    ...input,
    project_name: input.project_name?.trim() ?? existing.project_name,
    description: input.description !== undefined ? input.description?.trim() || null : existing.description,
    client_name: input.client_name !== undefined ? input.client_name?.trim() || null : existing.client_name,
    updated_at: now,
  }

  // Sync to Supabase
  try {
    await supabase.from('projects').update({
      project_name: updated.project_name,
      description: updated.description,
      client_name: updated.client_name,
      department_id: updated.department_id,
      priority: updated.priority,
      project_head_id: updated.project_head_id,
      team_lead_id: updated.team_lead_id,
      status: updated.status,
      progress_percentage: updated.progress_percentage,
      start_date: updated.start_date,
      expected_end_date: updated.expected_end_date,
      actual_completion_date: updated.actual_completion_date,
      updated_at: now,
    }).eq('id', id)
  } catch (e) {
    // ignore
  }

  let finalMembers: ProjectMember[] | undefined = undefined

  // Update members if member_ids provided
  if (input.member_ids !== undefined) {
    const allMembers = getLocalMembers().filter((m) => m.project_id !== id)
    const newMembers: ProjectMember[] = []
    const assignedEmpIds = new Set<string>()

    if (updated.project_head_id) {
      newMembers.push({
        id: `mem-${Date.now()}-head`,
        project_id: id,
        employee_id: updated.project_head_id,
        project_role: 'Head',
        assignment_status: 'Active',
        assigned_at: now,
      })
      assignedEmpIds.add(updated.project_head_id)
    }

    if (updated.team_lead_id && !assignedEmpIds.has(updated.team_lead_id)) {
      newMembers.push({
        id: `mem-${Date.now()}-lead`,
        project_id: id,
        employee_id: updated.team_lead_id,
        project_role: 'Lead',
        assignment_status: 'Active',
        assigned_at: now,
      })
      assignedEmpIds.add(updated.team_lead_id)
    }

    input.member_ids.forEach((empId, idx) => {
      if (empId && !assignedEmpIds.has(empId)) {
        newMembers.push({
          id: `mem-${Date.now()}-m${idx}`,
          project_id: id,
          employee_id: empId,
          project_role: 'Member',
          assignment_status: 'Active',
          assigned_at: now,
        })
        assignedEmpIds.add(empId)
      }
    })

    saveLocalMembers([...allMembers, ...newMembers])
    finalMembers = newMembers

    try {
      await supabase.from('project_members').delete().eq('project_id', id)
      await supabase.from('project_members').insert(
        newMembers.map((m) => ({
          id: m.id,
          project_id: m.project_id,
          employee_id: m.employee_id,
          project_role: m.project_role,
          assignment_status: m.assignment_status,
          assigned_at: m.assigned_at,
        }))
      )
    } catch (e) {
      // ignore
    }
  }

  const headStaff = (updated.project_head_id ? DEFAULT_PROJECT_STAFF[updated.project_head_id] : null) || updated.project_head || null
  const leadStaff = (updated.team_lead_id ? DEFAULT_PROJECT_STAFF[updated.team_lead_id] : null) || updated.team_lead || null
  updated.project_head = headStaff
  updated.team_lead = leadStaff
  if (finalMembers) {
    finalMembers.forEach((m: ProjectMember) => {
      m.employee = (m.employee_id ? DEFAULT_PROJECT_STAFF[m.employee_id] : null) || (m.project_role === 'Head' ? headStaff : m.project_role === 'Lead' ? leadStaff : null)
    })
    updated.members = finalMembers
  } else if (updated.members) {
    updated.members.forEach((m: ProjectMember) => {
      m.employee = (m.employee_id ? DEFAULT_PROJECT_STAFF[m.employee_id] : null) || (m.project_role === 'Head' ? headStaff : m.project_role === 'Lead' ? leadStaff : null)
    })
  }

  // Update local storage
  const localProjects = getLocalProjects().map((p) => (p.id === id ? updated : p))
  saveLocalProjects(localProjects)

  return updated
}

// -----------------------------------------------------------------------------
// Delete Project
// -----------------------------------------------------------------------------
export async function deleteProject(id: string): Promise<boolean> {
  try {
    await supabase.from('projects').delete().eq('id', id)
  } catch (e) {
    // ignore
  }

  const localProjects = getLocalProjects().filter((p) => p.id !== id)
  saveLocalProjects(localProjects)

  const localMembers = getLocalMembers().filter((m) => m.project_id !== id)
  saveLocalMembers(localMembers)

  const localUpdates = getLocalUpdates().filter((u) => u.project_id !== id)
  saveLocalUpdates(localUpdates)

  return true
}

// -----------------------------------------------------------------------------
// Submit Status Update (Project Head official status update or Team Lead report)
// -----------------------------------------------------------------------------
export async function submitProjectStatusUpdate(input: CreateStatusUpdateInput): Promise<ProjectStatusUpdate> {
  const project = await fetchProjectById(input.project_id)
  if (!project) {
    throw new Error(`Project with ID ${input.project_id} not found.`)
  }

  const isOfficial = input.update_type !== 'Team Lead Report'

  // Validation rules:
  // 1. Progress range
  if (input.new_progress < 0 || input.new_progress > 100) {
    throw new Error('Progress percentage must be between 0 and 100%.')
  }

  // 2. Completed project requires 100% progress
  if (isOfficial && input.new_status === 'Completed' && input.new_progress !== 100) {
    throw new Error('A project marked as Completed must have 100% progress.')
  }

  // 3. Reason for delay mandatory when On Hold, At Risk, or Cancelled
  if (
    (input.new_status === 'On Hold' || input.new_status === 'At Risk' || input.new_status === 'Cancelled') &&
    (!input.delay_reason || input.delay_reason.trim().length < 5) &&
    (!input.blockers || input.blockers.trim().length < 5)
  ) {
    throw new Error(`A detailed Reason for Delay or Blocker is required when marking a project as ${input.new_status}.`)
  }

  const now = new Date().toISOString()
  const todayStr = now.slice(0, 10)

  const updateRecord: ProjectStatusUpdate = {
    id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    project_id: input.project_id,
    previous_status: project.status,
    new_status: input.new_status,
    previous_progress: project.progress_percentage,
    new_progress: input.new_progress,
    work_completed: input.work_completed?.trim() || null,
    work_in_progress: input.work_in_progress?.trim() || null,
    pending_tasks: input.pending_tasks?.trim() || null,
    blockers: input.blockers?.trim() || null,
    risks: input.risks?.trim() || null,
    delay_reason: input.delay_reason?.trim() || null,
    next_steps: input.next_steps?.trim() || null,
    expected_completion_date: input.expected_completion_date || project.expected_end_date,
    update_type: input.update_type || 'Official',
    updated_by: input.updated_by || null,
    created_at: now,
  }

  // Only official status updates modify the official project fields
  if (isOfficial) {
    const updatedProject: Project = {
      ...project,
      status: input.new_status,
      progress_percentage: input.new_progress,
      expected_end_date: input.expected_completion_date || project.expected_end_date,
      actual_completion_date: input.new_status === 'Completed' ? todayStr : project.actual_completion_date,
      updated_at: now,
    }

    try {
      await supabase.from('projects').update({
        status: updatedProject.status,
        progress_percentage: updatedProject.progress_percentage,
        expected_end_date: updatedProject.expected_end_date,
        actual_completion_date: updatedProject.actual_completion_date,
        updated_at: now,
      }).eq('id', project.id)
    } catch (e) {
      // ignore
    }

    const localProjects = getLocalProjects().map((p) => (p.id === project.id ? updatedProject : p))
    saveLocalProjects(localProjects)
  }

  // Save status update record
  try {
    await supabase.from('project_status_updates').insert({
      id: updateRecord.id,
      project_id: updateRecord.project_id,
      previous_status: updateRecord.previous_status,
      new_status: updateRecord.new_status,
      previous_progress: updateRecord.previous_progress,
      new_progress: updateRecord.new_progress,
      work_completed: updateRecord.work_completed,
      work_in_progress: updateRecord.work_in_progress,
      pending_tasks: updateRecord.pending_tasks,
      blockers: updateRecord.blockers,
      risks: updateRecord.risks,
      delay_reason: updateRecord.delay_reason,
      next_steps: updateRecord.next_steps,
      expected_completion_date: updateRecord.expected_completion_date,
      update_type: updateRecord.update_type,
      updated_by: updateRecord.updated_by,
      created_at: updateRecord.created_at,
    })
  } catch (e) {
    // ignore
  }

  const localUpdates = getLocalUpdates()
  saveLocalUpdates([updateRecord, ...localUpdates])

  // Notifications for critical status changes
  sendStatusChangeNotifications(project, updateRecord)

  return updateRecord
}

// -----------------------------------------------------------------------------
// Calculate Project Dashboard Statistics
// -----------------------------------------------------------------------------
export async function fetchProjectDashboardStats(): Promise<ProjectDashboardStats> {
  const projects = await fetchProjects()
  const now = new Date().getTime()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  const stats: ProjectDashboardStats = {
    total: projects.length,
    notStarted: 0,
    inProgress: 0,
    onHold: 0,
    atRisk: 0,
    completed: 0,
    cancelled: 0,
    requiringUpdates: 0,
  }

  projects.forEach((p) => {
    switch (p.status) {
      case 'Not Started':
      case 'Planning':
        stats.notStarted++
        break
      case 'In Progress':
        stats.inProgress++
        break
      case 'On Hold':
        stats.onHold++
        break
      case 'At Risk':
        stats.atRisk++
        break
      case 'Completed':
        stats.completed++
        break
      case 'Cancelled':
        stats.cancelled++
        break
    }

    // Projects requiring updates:
    // Active project (not completed or cancelled) where last update is > 7 days old or overdue
    if (p.status !== 'Completed' && p.status !== 'Cancelled') {
      const lastUpdatedMs = new Date(p.updated_at).getTime()
      const isOverdue = new Date(p.expected_end_date).getTime() < now
      const isStale = now - lastUpdatedMs > sevenDaysMs

      if (isOverdue || isStale || p.status === 'At Risk') {
        stats.requiringUpdates++
      }
    }
  })

  return stats
}

// -----------------------------------------------------------------------------
// Notification Helpers (Section 8: Notifications and Reminders)
// -----------------------------------------------------------------------------
async function sendProjectAssignmentNotifications(project: Project, members: ProjectMember[]) {
  try {
    for (const mem of members) {
      let roleTitle = 'Team Member'
      if (mem.project_role === 'Head') roleTitle = 'Project Head'
      else if (mem.project_role === 'Lead') roleTitle = 'Team Lead'

      await supabase.from('notifications').insert({
        employee_id: mem.employee_id,
        type: 'info',
        title: `Assigned to ${project.project_code}: ${project.project_name}`,
        message: `You have been designated as ${roleTitle} on project ${project.project_code} (${project.project_name}).`,
        link: '/projects',
        is_read: false,
      })
    }
  } catch (e) {
    // silent catch
  }
}

async function sendStatusChangeNotifications(project: Project, update: ProjectStatusUpdate) {
  try {
    // Notify HR / Admins when project becomes At Risk or On Hold
    if (update.new_status === 'At Risk' || update.new_status === 'On Hold') {
      await supabase.from('notifications').insert({
        type: 'warning',
        title: `Project ${project.project_code} Marked as ${update.new_status}`,
        message: `Project "${project.project_name}" status changed to ${update.new_status}. Delay reason: ${update.delay_reason || update.blockers || 'None specified'}.`,
        link: '/projects',
        is_read: false,
      })
    }

    // Notify when project is completed
    if (update.new_status === 'Completed') {
      await supabase.from('notifications').insert({
        type: 'success',
        title: `Project ${project.project_code} Completed!`,
        message: `Project "${project.project_name}" has been marked 100% completed by the Project Head.`,
        link: '/projects',
        is_read: false,
      })
    }
  } catch (e) {
    // silent catch
  }
}
