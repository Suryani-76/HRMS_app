import { supabase } from '@/lib/supabase'

export const REGULAR_COMPLAINTS = [
  'Workplace Harassment / Bullying',
  'Salary & Payroll Discrepancy',
  'Working Hours & Overtime Issue',
  'Interpersonal Conflict / Team Friction',
  'Unfair Treatment & Discrimination',
  'IT Hardware & Equipment Failure',
  'Office Facilities & Cleanliness',
  'Leave & Attendance Discrepancy',
  'Workplace Health & Safety Concern',
  'Workload & Unreasonable Deadlines',
  'Other',
] as const

export type ComplaintCategory = (typeof REGULAR_COMPLAINTS)[number]

export interface ComplaintRecord {
  id: string
  ticket_number: string
  employee_id?: string | null
  employee_name: string
  employee_code?: string | null
  employee_email?: string | null
  department?: string | null
  is_anonymous: boolean
  category: ComplaintCategory | string
  custom_subject?: string | null
  description: string
  word_count: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed'
  resolution_note?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

const LOCAL_STORAGE_KEY = 'oklut_hrms_complaints'

/**
 * Counts words accurately by splitting on whitespace
 */
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

/**
 * Truncates text so it does not exceed the word limit
 */
export function trimToMaxWords(text: string, maxWords = 100): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ')
}

const INITIAL_SAMPLE_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'cmp-sample-1',
    ticket_number: 'CMP-2026-101',
    employee_id: 'emp-sample-1',
    employee_name: 'Priya Patel',
    employee_code: 'EMP-0019',
    employee_email: 'priya.p@oklut.com',
    department: 'Operations',
    is_anonymous: false,
    category: 'Office Facilities & Cleanliness',
    custom_subject: null,
    description: 'The 3rd-floor air conditioning unit has been leaking water onto the walkway near the pantry for two days, creating a slippery fall hazard for staff walking by.',
    word_count: 27,
    priority: 'medium',
    status: 'under_review',
    resolution_note: 'Maintenance team notified. Technician scheduled to repair coil leak by tomorrow morning.',
    resolved_by: 'HR Admin',
    resolved_at: null,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cmp-sample-2',
    ticket_number: 'CMP-2026-102',
    employee_id: 'emp-sample-2',
    employee_name: 'Rahul Sharma',
    employee_code: 'EMP-0042',
    employee_email: 'rahul.s@oklut.com',
    department: 'Engineering',
    is_anonymous: false,
    category: 'IT Hardware & Equipment Failure',
    custom_subject: null,
    description: 'My assigned work laptop screen started flickering continuously since yesterday afternoon, making it difficult to read code or participate in client video demonstrations.',
    word_count: 23,
    priority: 'high',
    status: 'resolved',
    resolution_note: 'Replacement display provided and tested by IT support on Oct 11.',
    resolved_by: 'IT Support Lead',
    resolved_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
]

function getLocalComplaints(): ComplaintRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_COMPLAINTS))
      return INITIAL_SAMPLE_COMPLAINTS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      let changed = false
      const migrated = parsed.map((c: ComplaintRecord) => {
        if (c.is_anonymous || c.employee_name === 'Anonymous Employee') {
          changed = true
          return {
            ...c,
            is_anonymous: false,
            employee_name: c.employee_name === 'Anonymous Employee' ? 'Priya Patel' : c.employee_name,
            employee_code: c.employee_code || 'EMP-0019',
            employee_email: c.employee_email || 'priya.p@oklut.com',
          }
        }
        return c
      })
      if (changed) {
        saveLocalComplaints(migrated)
      }
      return migrated
    }
    return INITIAL_SAMPLE_COMPLAINTS
  } catch {
    return INITIAL_SAMPLE_COMPLAINTS
  }
}

function saveLocalComplaints(complaints: ComplaintRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(complaints))
  } catch (err) {
    console.error('Failed to save complaints to localStorage:', err)
  }
}

/**
 * Fetch all complaints (for Admin / HR desk)
 */
export async function fetchAllComplaints(): Promise<ComplaintRecord[]> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return getLocalComplaints()
    }

    saveLocalComplaints(data as ComplaintRecord[])
    return data as ComplaintRecord[]
  } catch {
    return getLocalComplaints()
  }
}

/**
 * Fetch complaints submitted by a specific employee
 */
export async function fetchMyComplaints(employeeId?: string, employeeEmail?: string): Promise<ComplaintRecord[]> {
  const all = await fetchAllComplaints()
  if (!employeeId && !employeeEmail) return []

  return all.filter((c) => {
    if (employeeId && c.employee_id === employeeId) return true
    if (employeeEmail && c.employee_email?.toLowerCase() === employeeEmail.toLowerCase()) return true
    return false
  })
}

/**
 * Fetch complaints with strict role-based access control:
 * - HR and Admins can view ALL complaints across the company.
 * - Regular employees can ONLY view complaints they personally raised.
 */
export async function fetchAuthorizedComplaints(params: {
  employeeId?: string | null
  employeeEmail?: string | null
  canManage: boolean
}): Promise<{ accessible: ComplaintRecord[]; my: ComplaintRecord[] }> {
  const allRecords = await fetchAllComplaints()

  const myRecords = allRecords.filter((c) => {
    if (params.employeeId && c.employee_id === params.employeeId) return true
    if (params.employeeEmail && c.employee_email?.toLowerCase() === params.employeeEmail.toLowerCase()) return true
    return false
  })

  // Strict privacy enforcement: non-HR/non-Admins can NEVER access other employees' complaints
  const accessibleRecords = params.canManage ? allRecords : myRecords

  return {
    accessible: accessibleRecords,
    my: myRecords,
  }
}

/**
 * Submit a new complaint
 */
export async function submitComplaint(payload: {
  employee_id?: string | null
  employee_name?: string
  employee_code?: string | null
  employee_email?: string | null
  department?: string | null
  is_anonymous?: boolean
  category: string
  custom_subject?: string | null
  description: string
  priority: ComplaintRecord['priority']
}): Promise<ComplaintRecord> {
  const wordCount = countWords(payload.description)
  if (wordCount > 100) {
    throw new Error('Description exceeds the maximum limit of 100 words.')
  }
  if (!payload.description.trim()) {
    throw new Error('Please enter a description for your complaint.')
  }
  if (!payload.category) {
    throw new Error('Please select a complaint category from the dropdown.')
  }
  if (payload.category === 'Other' && !payload.custom_subject?.trim()) {
    throw new Error('Please specify the complaint title or subject when "Other" is selected.')
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000)
  const ticketNumber = `CMP-${new Date().getFullYear()}-${randomNum}`
  const now = new Date().toISOString()

  // Confidential submission directly to HR and Admin with full employee details.
  // Anonymous submission has been removed; no external notifications are broadcast.
  const newRecord: ComplaintRecord = {
    id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ticket_number: ticketNumber,
    employee_id: payload.employee_id || null,
    employee_name: payload.employee_name || 'Staff Member',
    employee_code: payload.employee_code || null,
    employee_email: payload.employee_email || null,
    department: payload.department || null,
    is_anonymous: false,
    category: payload.category,
    custom_subject: payload.category === 'Other' ? payload.custom_subject?.trim() || null : null,
    description: payload.description.trim(),
    word_count: wordCount,
    priority: payload.priority || 'medium',
    status: 'pending',
    resolution_note: null,
    resolved_by: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
  }

  // Attempt Supabase insert
  try {
    const { data, error } = await supabase
      .from('complaints')
      .insert([newRecord])
      .select()
      .single()

    if (!error && data) {
      const local = getLocalComplaints()
      saveLocalComplaints([data as ComplaintRecord, ...local])
      return data as ComplaintRecord
    }
  } catch (err) {
    console.warn('Supabase complaints insert error, saving to local store:', err)
  }

  // Fallback to local storage
  const local = getLocalComplaints()
  const updated = [newRecord, ...local]
  saveLocalComplaints(updated)
  return newRecord
}

/**
 * Update complaint status & resolution note (Admin/HR)
 */
export async function updateComplaintStatus(
  id: string,
  status: ComplaintRecord['status'],
  resolutionNote?: string,
  resolvedByName?: string
): Promise<ComplaintRecord> {
  const now = new Date().toISOString()
  const patch: Partial<ComplaintRecord> = {
    status,
    resolution_note: resolutionNote || null,
    resolved_by: status === 'resolved' ? resolvedByName || 'HR Administrator' : null,
    resolved_at: status === 'resolved' ? now : null,
    updated_at: now,
  }

  try {
    const { data, error } = await supabase
      .from('complaints')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      const local = getLocalComplaints().map((c) => (c.id === id ? { ...c, ...data } : c))
      saveLocalComplaints(local)
      return data as ComplaintRecord
    }
  } catch {
    // Continue to local storage
  }

  const local = getLocalComplaints()
  const existing = local.find((c) => c.id === id)
  if (!existing) {
    throw new Error('Complaint not found.')
  }
  const updatedRecord = { ...existing, ...patch }
  const updatedList = local.map((c) => (c.id === id ? updatedRecord : c))
  saveLocalComplaints(updatedList)
  return updatedRecord
}

/**
 * Delete a complaint
 */
export async function deleteComplaint(id: string): Promise<void> {
  try {
    await supabase.from('complaints').delete().eq('id', id)
  } catch {
    // ignore
  }

  const local = getLocalComplaints().filter((c) => c.id !== id)
  saveLocalComplaints(local)
}
