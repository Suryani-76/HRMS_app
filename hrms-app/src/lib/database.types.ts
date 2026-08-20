// Database row types mirroring the Supabase schema (supabase/migrations/0001_schema.sql)

export interface Role {
  id: string
  name: string
  description?: string | null
  created_at: string
}

export interface Permission {
  id: string
  name: string
  module: string
  description?: string | null
}

export interface Department {
  id: string
  name: string
  code?: string | null
  description?: string | null
  head_id?: string | null
  created_at: string
  head?: Pick<Employee, 'first_name' | 'last_name'> | null
}

export interface Designation {
  id: string
  name: string
  department_id?: string | null
  level: number
  created_at: string
  department?: Department | null
}

export interface Employee {
  id: string
  employee_code?: string | null
  user_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  gender?: string | null
  date_of_birth?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postal_code?: string | null
  // Guardian / Emergency Contact
  emergency_contact?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relation?: string | null
  emergency_contact_phone?: string | null
  guardian_name?: string | null
  guardian_phone?: string | null
  guardian_relation?: string | null
  // Current Address
  current_address?: string | null
  current_city?: string | null
  current_state?: string | null
  current_country?: string | null
  current_postal_code?: string | null
  // Permanent Address
  permanent_address?: string | null
  permanent_city?: string | null
  permanent_state?: string | null
  permanent_country?: string | null
  permanent_postal_code?: string | null
  marital_status?: string | null
  blood_group?: string | null
  joining_date: string
  employment_type?: string | null
  department_id?: string | null
  designation_id?: string | null
  manager_id?: string | null
  status?: string | null
  profile_picture_url?: string | null
  branch?: string | null
  created_at: string
  updated_at: string
  department?: Department | null
  designation?: Designation | null
  manager?: Employee | null
}

export interface UserProfile {
  id: string
  email: string
  role_id: string
  employee_id?: string | null
  status?: string | null
  last_login_at?: string | null
  created_at: string
  role?: Role | null
  employee?: Employee | null
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  check_in?: string | null
  check_out?: string | null
  break_in?: string | null
  break_out?: string | null
  working_hours: number
  overtime_hours: number
  status?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  employee?: Employee | null
}

export interface LeaveType {
  id: string
  name: string
  days_per_year: number
  is_paid: boolean
  created_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  reason?: string | null
  status?: string | null
  admin_comment?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  applied_at: string
  updated_at: string
  employee?: Employee | null
  leave_type?: LeaveType | null
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type_id: string
  year: number
  allocated: number
  used: number
  created_at: string
  leave_type?: LeaveType | null
}

export interface PayrollProfile {
  employee_id: string
  basic_salary: number
  hra: number
  allowances: number
  bonus: number
  pf_percent: number
  tax_percent: number
  bank_name?: string | null
  bank_account?: string | null
  ifsc_code?: string | null
  updated_at: string
  employee?: Employee | null
}

export interface Payroll {
  id: string
  employee_id: string
  pay_period: string
  basic_salary: number
  hra: number
  allowances: number
  bonus: number
  deductions: number
  tax: number
  provident_fund: number
  present_days: number
  total_days: number
  net_salary: number
  status?: string | null
  generated_at?: string | null
  paid_at?: string | null
  created_at: string
  employee?: Employee | null
}

export interface Document {
  id: string
  employee_id: string
  name: string
  doc_type?: string | null
  file_url?: string | null
  file_size?: number | null
  uploaded_by?: string | null
  created_at: string
  employee?: Employee | null
}

export interface Task {
  id: string
  title: string
  description?: string | null
  assignee_id?: string | null
  assigner_id?: string | null
  due_date?: string | null
  priority?: string | null
  status?: string | null
  created_at: string
  updated_at: string
  assignee?: Employee | null
  assigner?: Employee | null
}

export interface Announcement {
  id: string
  title: string
  content: string
  audience?: string | null
  department_id?: string | null
  author_id?: string | null
  published_at: string
  expires_at?: string | null
  created_at: string
  department?: Department | null
}

export interface Notification {
  id: string
  user_id?: string | null
  employee_id?: string | null
  type?: string | null
  title: string
  message?: string | null
  link?: string | null
  is_read: boolean
  created_at: string
}

export interface Holiday {
  id: string
  name: string
  date: string
  is_optional: boolean
  created_at: string
}

export interface PerformanceGoal {
  id: string
  employee_id: string
  reviewer_id?: string | null
  title: string
  description?: string | null
  target?: string | null
  due_date?: string | null
  status?: string | null
  created_at: string
  employee?: Employee | null
}

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id?: string | null
  period: string
  goals?: string | null
  strengths?: string | null
  improvements?: string | null
  rating?: number | null
  comments?: string | null
  status?: string | null
  review_date?: string | null
  cycle_level?: number
  created_at: string
  updated_at: string
  employee?: Employee | null
}

export interface JobOpening {
  id: string
  title: string
  department_id?: string | null
  location?: string | null
  openings_count: number
  description?: string | null
  requirements?: string | null
  employment_type?: string | null
  status?: string | null
  published: boolean
  created_by?: string | null
  created_at: string
  department?: Department | null
}

export interface Candidate {
  id: string
  job_opening_id?: string | null
  name: string
  email: string
  phone?: string | null
  resume_url?: string | null
  cover_letter?: string | null
  status?: string | null
  source?: string | null
  converted_employee_id?: string | null
  reference_id?: string | null
  temp_id?: string | null
  date_of_birth?: string | null
  dob?: string | null
  referred_by?: string | null
  ats_score?: number | null
  applied_at: string
  updated_at: string
  job_opening?: JobOpening | null
  converted_employee?: Employee | null
}

export interface Interview {
  id: string
  candidate_id: string
  job_opening_id?: string | null
  interviewer_id?: string | null
  round: string
  scheduled_at: string
  mode?: string | null
  meeting_link?: string | null
  exam_link?: string | null
  status?: string | null
  feedback?: string | null
  rating?: number | null
  malpractice_flag?: boolean
  created_at: string
  candidate?: Candidate | null
  job_opening?: JobOpening | null
  interviewer?: Employee | null
}

export interface Offer {
  id: string
  candidate_id: string
  job_opening_id?: string | null
  offer_letter_url?: string | null
  salary_offered?: number | null
  joining_date?: string | null
  status?: string | null
  candidate_response?: string | null
  relocation_agreed?: boolean | null
  bond_agreed?: boolean | null
  issued_by?: string | null
  created_at: string
  candidate?: Candidate | null
  job_opening?: JobOpening | null
}

export interface AuditLog {
  id: string
  user_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  details?: Record<string, unknown> | null
  created_at: string
}

// --- New Roadmap Types ---
export interface RecruiterIncentive {
  id: string
  recruiter_id: string
  month: string
  it_hires: number
  non_it_hires: number
  salary_bonus: number
  gift_points: number
  created_at: string
}

export interface InsuranceEnrollment {
  id: string
  employee_id: string
  employer_info?: string | null
  policy_info?: string | null
  residential_address?: string | null
  current_address?: string | null
  permanent_address?: string | null
  nominee_name?: string | null
  nominee_relation?: string | null
  nominee_dob?: string | null
  nominee_share?: number | null
  // Secondary Nominee (Nominee 2)
  nominee2_name?: string | null
  nominee2_relation?: string | null
  nominee2_dob?: string | null
  nominee2_share?: number | null
  existing_insurance_details?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  bank_name?: string | null
  bank_account?: string | null
  bank_ifsc?: string | null
  ifsc_code?: string | null
  declaration_signature?: string | null
  declaration_signed: boolean
  declaration_date?: string | null
  created_at: string
}

export interface Asset {
  id: string
  type: string
  serial_number?: string | null
  assigned_to?: string | null
  status: string
  assigned_at?: string | null
  created_at: string
}

export interface AssetIncident {
  id: string
  asset_id: string
  employee_id: string
  incident_type: string
  report?: string | null
  penalty_charge: number
  status: string
  hr_sign_off?: string | null
  created_at: string
}

export interface MeetingHallBooking {
  id: string
  title: string
  description?: string | null
  start_time: string
  end_time: string
  requested_by: string
  status: string
  admin_comment?: string | null
  created_at: string
  updated_at: string
  requester?: Employee | null
}

// Minimal Database mapping used by the typed supabase client.
export interface Database {
  public: {
    Tables: {
      roles: { Row: Role }
      permissions: { Row: Permission }
      role_permissions: { Row: { role_id: string; permission_id: string } }
      departments: { Row: Department }
      designations: { Row: Designation }
      employees: { Row: Employee }
      users: { Row: UserProfile }
      attendance: { Row: Attendance }
      leave_types: { Row: LeaveType }
      leave_requests: { Row: LeaveRequest }
      leave_balances: { Row: LeaveBalance }
      payroll_profiles: { Row: PayrollProfile }
      payroll: { Row: Payroll }
      documents: { Row: Document }
      tasks: { Row: Task }
      announcements: { Row: Announcement }
      notifications: { Row: Notification }
      holidays: { Row: Holiday }
      performance_goals: { Row: PerformanceGoal }
      performance_reviews: { Row: PerformanceReview }
      job_openings: { Row: JobOpening }
      candidates: { Row: Candidate }
      interviews: { Row: Interview }
      offers: { Row: Offer }
      audit_logs: { Row: AuditLog }
      recruiter_incentives: { Row: RecruiterIncentive }
      insurance_enrollments: { Row: InsuranceEnrollment }
      assets: { Row: Asset }
      asset_incidents: { Row: AssetIncident }
      meeting_hall_bookings: { Row: MeetingHallBooking }
    }
  }
}

export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
} as const

export const isAdminRole = (role?: string | null) => {
  if (!role) return false
  const r = role.trim().toLowerCase()
  return r === 'admin' || r === 'ceo' || r === 'superadmin' || r === 'super_admin'
}

export const isManagerRole = (role?: string | null) => {
  if (!role) return false
  const r = role.trim().toLowerCase()
  return r === 'admin' || r === 'manager' || r === 'hr' || r === 'ceo' || r === 'superadmin'
}

