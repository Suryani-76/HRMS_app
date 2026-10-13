import { supabase } from '@/lib/supabase'

export const SERVICE_REQUEST_CATEGORIES = [
  'IT Hardware & Laptop Issue',
  'Software, Email & System Access',
  'Payroll, Salary & Payout Discrepancy',
  'HR Policy, Leave & Attendance Query',
  'Workplace, Desk & Facilities Maintenance',
  'Identity Card, Parking & Assets',
  'Health, Insurance & Medical Benefits',
  'General Workplace Request',
  'Other',
] as const

export type ServiceRequestCategory = (typeof SERVICE_REQUEST_CATEGORIES)[number]

export interface ServiceRequestAttachment {
  name: string
  size: number
  type: string
  url: string // Public URL or Base64 Data URL
  uploaded_at: string
}

export interface ServiceRequest {
  id: string
  ticket_number: string
  employee_id: string
  employee_name: string
  employee_code?: string | null
  employee_email?: string | null
  department?: string | null
  category: ServiceRequestCategory | string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  description: string
  attachments: ServiceRequestAttachment[]
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  // HR / Admin Action Fields
  action_notes?: string | null
  action_by_name?: string | null
  action_by_email?: string | null
  action_at?: string | null
  action_attachments: ServiceRequestAttachment[]
  created_at: string
  updated_at: string
}

const LOCAL_STORAGE_KEY = 'oklut_hrms_service_requests'

const INITIAL_SAMPLE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-sample-1',
    ticket_number: 'SR-2026-4102',
    employee_id: 'emp-sample-1',
    employee_name: 'Rahul Sharma',
    employee_code: 'EMP-0042',
    employee_email: 'rahul.s@oklut.com',
    department: 'Engineering',
    category: 'IT Hardware & Laptop Issue',
    priority: 'high',
    subject: 'Laptop battery draining in 40 minutes & overheating',
    description: 'My allocated company laptop (LP-2026-042) is overheating rapidly and the battery discharges in less than 40 minutes while running IDE development tools. Requesting battery replacement or hardware diagnostics.',
    attachments: [
      {
        name: 'battery_diagnostic_report.png',
        size: 142050,
        type: 'image/png',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="20" y="60" fill="%23475569" font-size="12">Diagnostic Snapshot</text></svg>',
        uploaded_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      },
    ],
    status: 'in_progress',
    action_notes: 'IT hardware team has ordered a replacement OEM battery pack. Scheduled replacement session with IT desk on Wednesday 2:00 PM.',
    action_by_name: 'HR Desk Admin',
    action_by_email: 'hr@oklut.com',
    action_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    action_attachments: [],
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'sr-sample-2',
    ticket_number: 'SR-2026-3891',
    employee_id: 'emp-sample-2',
    employee_name: 'Priya Patel',
    employee_code: 'EMP-0055',
    employee_email: 'priya.p@oklut.com',
    department: 'Operations',
    category: 'Payroll, Salary & Payout Discrepancy',
    priority: 'medium',
    subject: 'Overtime allowance for late sprint deployment missing on payslip',
    description: 'During last month sprint release on Sept 28-29, 6 hours of approved overtime were logged but not reflected in the latest payroll calculation statement.',
    attachments: [
      {
        name: 'sept_timesheet_approval.pdf',
        size: 215400,
        type: 'application/pdf',
        url: 'data:text/plain;base64,UERGX1BsYWNlaG9sZGVy',
        uploaded_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
    ],
    status: 'resolved',
    action_notes: 'Reviewed with Finance. Approved overtime of 6 hours (INR 2,850) adjusted and disbursed via supplementary credit. Attached updated statement.',
    action_by_name: 'Pooja Reddy (HR Manager)',
    action_by_email: 'pooja.r@oklut.com',
    action_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    action_attachments: [
      {
        name: 'adjusted_payout_slip_signed.pdf',
        size: 198000,
        type: 'application/pdf',
        url: 'data:text/plain;base64,UERGX1Jlc29sdXRpb24=',
        uploaded_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
]

function getLocalServiceRequests(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_REQUESTS))
      return INITIAL_SAMPLE_REQUESTS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : INITIAL_SAMPLE_REQUESTS
  } catch {
    return INITIAL_SAMPLE_REQUESTS
  }
}

function saveLocalServiceRequests(requests: ServiceRequest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests))
  } catch (err) {
    console.error('Failed to save service requests to localStorage:', err)
  }
}

/**
 * Upload an attachment document with Supabase Storage and fallback to Base64 data URL
 */
export async function uploadServiceRequestDocument(file: File): Promise<ServiceRequestAttachment> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()

  try {
    const path = `service_requests/${timestamp}-${safeName}`
    const { data, error } = await supabase.storage.from('documents').upload(path, file)
    if (!error && data) {
      const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(path)
      return {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: pubUrl.publicUrl,
        uploaded_at: new Date().toISOString(),
      }
    }
  } catch {
    // Continue to Base64 data URL fallback
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: reader.result as string,
        uploaded_at: new Date().toISOString(),
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Fetch all service requests from Supabase or LocalStorage
 */
export async function fetchAllServiceRequests(): Promise<ServiceRequest[]> {
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return getLocalServiceRequests()
    }

    saveLocalServiceRequests(data as ServiceRequest[])
    return data as ServiceRequest[]
  } catch {
    return getLocalServiceRequests()
  }
}

/**
 * Fetch service requests with strict authorization:
 * - HR & Admin: Can view ALL tickets submitted by all employees.
 * - Regular Employees: Can ONLY view tickets they personally submitted.
 */
export async function fetchAuthorizedServiceRequests(params: {
  employeeId?: string | null
  employeeEmail?: string | null
  canManage: boolean // true for HR & Admin
}): Promise<{ accessible: ServiceRequest[]; my: ServiceRequest[] }> {
  const allRecords = await fetchAllServiceRequests()

  const myRecords = allRecords.filter((req) => {
    if (params.employeeId && req.employee_id === params.employeeId) return true
    if (params.employeeEmail && req.employee_email?.toLowerCase() === params.employeeEmail.toLowerCase()) return true
    return false
  })

  // Strict confidentiality: Non-HR/Non-Admin personnel can never see another employee's request
  const accessibleRecords = params.canManage ? allRecords : myRecords

  return {
    accessible: accessibleRecords,
    my: myRecords,
  }
}

/**
 * Submit a new Service Request / Ticket
 */
export async function createServiceRequest(payload: {
  employee_id: string
  employee_name: string
  employee_code?: string | null
  employee_email?: string | null
  department?: string | null
  category: ServiceRequestCategory | string
  priority: ServiceRequest['priority']
  subject: string
  description: string
  attachments: ServiceRequestAttachment[]
}): Promise<ServiceRequest> {
  if (!payload.subject?.trim()) {
    throw new Error('Please enter a subject or title for the issue.')
  }
  if (!payload.description?.trim()) {
    throw new Error('Please describe the issue in the description box.')
  }
  if (!payload.category) {
    throw new Error('Please select an issue category.')
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const ticketNumber = `SR-${new Date().getFullYear()}-${randomSuffix}`
  const now = new Date().toISOString()

  const newRecord: ServiceRequest = {
    id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ticket_number: ticketNumber,
    employee_id: payload.employee_id,
    employee_name: payload.employee_name,
    employee_code: payload.employee_code || null,
    employee_email: payload.employee_email || null,
    department: payload.department || null,
    category: payload.category,
    priority: payload.priority || 'medium',
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    attachments: payload.attachments || [],
    status: 'pending',
    action_notes: null,
    action_by_name: null,
    action_by_email: null,
    action_at: null,
    action_attachments: [],
    created_at: now,
    updated_at: now,
  }

  // Attempt Supabase insert
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .insert([newRecord])
      .select()
      .single()

    if (!error && data) {
      const local = getLocalServiceRequests()
      saveLocalServiceRequests([data as ServiceRequest, ...local])
      return data as ServiceRequest
    }
  } catch (err) {
    console.warn('Supabase service_requests insert error, persisting to local store:', err)
  }

  // Fallback to local storage
  const local = getLocalServiceRequests()
  const updated = [newRecord, ...local]
  saveLocalServiceRequests(updated)
  return newRecord
}

/**
 * HR / Admin Action: Update ticket status, provide resolution notes, and attach files
 */
export async function updateServiceRequestAction(
  id: string,
  payload: {
    status: ServiceRequest['status']
    action_notes: string
    action_by_name: string
    action_by_email?: string
    action_attachments?: ServiceRequestAttachment[]
  }
): Promise<ServiceRequest> {
  const now = new Date().toISOString()

  const patch: Partial<ServiceRequest> = {
    status: payload.status,
    action_notes: payload.action_notes?.trim() || null,
    action_by_name: payload.action_by_name || 'HR & Admin Desk',
    action_by_email: payload.action_by_email || null,
    action_at: now,
    action_attachments: payload.action_attachments || [],
    updated_at: now,
  }

  try {
    const { data, error } = await supabase
      .from('service_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      const local = getLocalServiceRequests().map((r) => (r.id === id ? { ...r, ...data } : r))
      saveLocalServiceRequests(local)
      return data as ServiceRequest
    }
  } catch {
    // Continue to local storage
  }

  const local = getLocalServiceRequests()
  const existing = local.find((r) => r.id === id)
  if (!existing) {
    throw new Error('Service request not found.')
  }

  const updatedRecord: ServiceRequest = {
    ...existing,
    ...patch,
    action_attachments: payload.action_attachments !== undefined ? payload.action_attachments : existing.action_attachments,
  }

  const updatedList = local.map((r) => (r.id === id ? updatedRecord : r))
  saveLocalServiceRequests(updatedList)
  return updatedRecord
}

/**
 * Delete a Service Request (HR / Admin only)
 */
export async function deleteServiceRequest(id: string): Promise<void> {
  try {
    await supabase.from('service_requests').delete().eq('id', id)
  } catch {
    // Ignore
  }

  const local = getLocalServiceRequests().filter((r) => r.id !== id)
  saveLocalServiceRequests(local)
}
