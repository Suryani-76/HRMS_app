import { supabase } from '@/lib/supabase'

export interface EmployeeBankDetail {
  id: string
  employee_id: string
  employee_code: string
  employee_name: string
  employee_email: string
  phone?: string
  department?: string
  designation?: string
  bank_name: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  branch_name: string
  account_type: 'Salary' | 'Savings' | 'Current'
  upi_id?: string
  pan_number?: string
  document_proof_name?: string
  document_proof_type?: string
  document_proof_data?: string // Data URL or storage link
  status: 'verified' | 'pending' | 'rejected'
  verified_by?: string
  verified_at?: string
  rejection_reason?: string
  admin_note?: string
  submitted_at: string
  updated_at: string
}

export const POPULAR_BANKS = [
  'HDFC Bank',
  'State Bank of India (SBI)',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'IDFC FIRST Bank',
  'Federal Bank',
  'Yes Bank',
  'Indian Bank',
  'Central Bank of India',
]

const LOCAL_STORAGE_KEY = 'oklut_db_employee_bank_details'

// Initial seed bank details linked to actual system employees
const INITIAL_BANK_SEEDS: EmployeeBankDetail[] = [
  {
    id: 'bank-rec-001',
    employee_id: '6a7db9e3-81e1-444e-9fd8-1ca4a32a916d',
    employee_code: 'OKL-GEN-2026-107',
    employee_name: 'Sandeep Reddy Guda',
    employee_email: 's.guda@oklut.com',
    phone: '7893638147',
    department: 'Engineering',
    designation: 'Senior Full Stack Developer',
    bank_name: 'HDFC Bank',
    account_holder_name: 'Sandeep Reddy Guda',
    account_number: '50100492817263',
    ifsc_code: 'HDFC0001234',
    branch_name: 'Madhapur Branch, Hyderabad',
    account_type: 'Salary',
    upi_id: 'sandeep.guda@okhdfcbank',
    pan_number: 'ABCPS1234F',
    document_proof_name: 'sandeep_hdfc_cancelled_cheque.pdf',
    status: 'verified',
    verified_by: 'HR Admin (Priya Menon)',
    verified_at: '2026-09-15T10:30:00.000Z',
    submitted_at: '2026-09-14T14:20:00.000Z',
    updated_at: '2026-09-15T10:30:00.000Z',
  },
  {
    id: 'bank-rec-002',
    employee_id: 'f5751abf-b32a-4280-b892-e20ec98f2e6e',
    employee_code: 'OKL-GEN-2026-111',
    employee_name: 'Pavan Mettupalli',
    employee_email: 'p.mettupalli@oklut.com',
    phone: '9676608207',
    department: 'Technology',
    designation: 'Systems Architect',
    bank_name: 'State Bank of India (SBI)',
    account_holder_name: 'Pavan Mettupalli',
    account_number: '381920491823',
    ifsc_code: 'SBIN0004521',
    branch_name: 'HITEC City, Hyderabad',
    account_type: 'Salary',
    upi_id: 'pavan.met@oksbi',
    pan_number: 'BNMPM9876K',
    document_proof_name: 'pavan_sbi_passbook_copy.jpg',
    status: 'verified',
    verified_by: 'HR Admin (Priya Menon)',
    verified_at: '2026-09-18T11:00:00.000Z',
    submitted_at: '2026-09-17T16:15:00.000Z',
    updated_at: '2026-09-18T11:00:00.000Z',
  },
  {
    id: 'bank-rec-003',
    employee_id: '96ad9885-8219-4490-a0fc-c69cdebc0405',
    employee_code: 'OKL-GEN-2026-113',
    employee_name: 'Lavanya Nakka',
    employee_email: 'l.nakka@oklut.com',
    phone: '8341184232',
    department: 'Human Resources',
    designation: 'Talent Acquisition Specialist',
    bank_name: 'ICICI Bank',
    account_holder_name: 'Lavanya Nakka',
    account_number: '109283746501',
    ifsc_code: 'ICIC0000345',
    branch_name: 'Gachibowli, Hyderabad',
    account_type: 'Salary',
    upi_id: 'lavanya.nakka@okicici',
    pan_number: 'CLPNK4521A',
    document_proof_name: 'lavanya_icici_cheque.pdf',
    status: 'pending',
    submitted_at: '2026-10-04T09:45:00.000Z',
    updated_at: '2026-10-04T09:45:00.000Z',
  },
  {
    id: 'bank-rec-004',
    employee_id: '627598c7-8782-497f-a435-7363f31b83a6',
    employee_code: 'OKL-GEN-2026-109',
    employee_name: 'Sandhi jenny',
    employee_email: 'j.sandhi@oklut.com',
    phone: '7093719747',
    department: 'Design & UI/UX',
    designation: 'UI/UX Lead',
    bank_name: 'Axis Bank',
    account_holder_name: 'Sandhi Jenny',
    account_number: '918020048192831',
    ifsc_code: 'UTIB0001089',
    branch_name: 'Kondapur, Hyderabad',
    account_type: 'Savings',
    upi_id: 'jenny.sandhi@okaxis',
    pan_number: 'DKPSJ6789L',
    document_proof_name: 'sandhi_passbook.png',
    status: 'pending',
    submitted_at: '2026-10-05T15:20:00.000Z',
    updated_at: '2026-10-05T15:20:00.000Z',
  },
  {
    id: 'bank-rec-005',
    employee_id: 'fa36d57b-13c2-4632-8af2-c64f09d1d881',
    employee_code: 'OKL-GEN-2026-100',
    employee_name: 'Mounika Vepur',
    employee_email: 'm.vepur@oklut.com',
    phone: '9440845670',
    department: 'Marketing',
    designation: 'Growth Marketing Executive',
    bank_name: 'Kotak Mahindra Bank',
    account_holder_name: 'Mounika Vepuri',
    account_number: '7481920381',
    ifsc_code: 'KKBK0008012',
    branch_name: 'Jubilee Hills, Hyderabad',
    account_type: 'Salary',
    upi_id: 'mounika.vepur@kotak',
    pan_number: 'EMPVV1122C',
    document_proof_name: 'mounika_cheque_leaf.pdf',
    status: 'rejected',
    rejection_reason: 'Account holder name on cheque leaf has a slight spelling variation from government ID. Please provide bank passbook or statement with exact name.',
    verified_by: 'HR Admin (Priya Menon)',
    verified_at: '2026-10-02T16:00:00.000Z',
    submitted_at: '2026-10-01T11:10:00.000Z',
    updated_at: '2026-10-02T16:00:00.000Z',
  },
]

function getLocalBankDetails(): EmployeeBankDetail[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_BANK_SEEDS))
      return INITIAL_BANK_SEEDS
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_BANK_SEEDS))
      return INITIAL_BANK_SEEDS
    }
    return parsed
  } catch {
    return INITIAL_BANK_SEEDS
  }
}

function saveLocalBankDetails(list: EmployeeBankDetail[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event('oklut-bank-details-updated'))
  } catch (e) {
    console.error('Failed to store bank details locally:', e)
  }
}

/**
 * Fetch all submitted employee bank details (for HR / Admin Sector)
 */
export async function fetchAllEmployeeBankDetails(): Promise<EmployeeBankDetail[]> {
  try {
    // Attempt Supabase fetch if table exists
    const { data, error } = await supabase
      .from('employee_bank_details')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (!error && data && data.length > 0) {
      saveLocalBankDetails(data as EmployeeBankDetail[])
      return data as EmployeeBankDetail[]
    }
  } catch (err) {
    console.warn('Supabase bank details notice, utilizing local repository:', err)
  }

  return getLocalBankDetails()
}

/**
 * Fetch bank detail for a single employee by employee ID, email, or employee code
 */
export async function fetchBankDetailByEmployee(
  query: string
): Promise<EmployeeBankDetail | null> {
  const clean = (query || '').trim().toLowerCase()
  if (!clean) return null

  const list = getLocalBankDetails()
  const found = list.find(
    (d) =>
      d.employee_id.toLowerCase() === clean ||
      d.employee_code.toLowerCase() === clean ||
      d.employee_email.toLowerCase() === clean
  )

  return found || null
}

/**
 * Submit or update bank details for an employee
 */
export async function submitEmployeeBankDetail(
  input: Omit<EmployeeBankDetail, 'id' | 'submitted_at' | 'updated_at'> & { id?: string }
): Promise<EmployeeBankDetail> {
  const now = new Date().toISOString()
  const list = getLocalBankDetails()
  const existingIdx = list.findIndex(
    (d) =>
      d.id === input.id ||
      d.employee_id.toLowerCase() === input.employee_id.toLowerCase() ||
      d.employee_email.toLowerCase() === input.employee_email.toLowerCase() ||
      d.employee_code.toLowerCase() === input.employee_code.toLowerCase()
  )

  let resultRecord: EmployeeBankDetail

  if (existingIdx >= 0) {
    const existing = list[existingIdx]
    resultRecord = {
      ...existing,
      ...input,
      id: existing.id,
      status: 'pending', // Re-submitting puts it back to pending verification
      rejection_reason: undefined,
      submitted_at: existing.submitted_at || now,
      updated_at: now,
    }
    list[existingIdx] = resultRecord
  } else {
    resultRecord = {
      ...input,
      id: input.id || 'bank-rec-' + Date.now(),
      status: 'pending',
      submitted_at: now,
      updated_at: now,
    }
    list.unshift(resultRecord)
  }

  saveLocalBankDetails(list)

  // Try saving to Supabase if table is present
  try {
    await supabase.from('employee_bank_details').upsert(resultRecord)
  } catch (err) {
    console.warn('Bank detail Supabase notice:', err)
  }

  return resultRecord
}

/**
 * HR / Admin action: Verify & Approve employee bank details
 */
export async function verifyEmployeeBankDetail(
  id: string,
  verifiedBy: string = 'HR Admin',
  adminNote?: string
): Promise<EmployeeBankDetail> {
  const now = new Date().toISOString()
  const list = getLocalBankDetails()
  const idx = list.findIndex((d) => d.id === id)
  if (idx === -1) throw new Error('Bank detail record not found')

  const updated: EmployeeBankDetail = {
    ...list[idx],
    status: 'verified',
    verified_by: verifiedBy,
    verified_at: now,
    admin_note: adminNote || list[idx].admin_note,
    rejection_reason: undefined,
    updated_at: now,
  }

  list[idx] = updated
  saveLocalBankDetails(list)

  try {
    await supabase.from('employee_bank_details').update({
      status: 'verified',
      verified_by: verifiedBy,
      verified_at: now,
      admin_note: adminNote,
      updated_at: now,
    }).eq('id', id)
  } catch (err) {
    console.warn('Verify bank detail Supabase notice:', err)
  }

  return updated
}

/**
 * HR / Admin action: Reject bank details with a specific reason
 */
export async function rejectEmployeeBankDetail(
  id: string,
  reason: string,
  rejectedBy: string = 'HR Admin'
): Promise<EmployeeBankDetail> {
  const now = new Date().toISOString()
  const list = getLocalBankDetails()
  const idx = list.findIndex((d) => d.id === id)
  if (idx === -1) throw new Error('Bank detail record not found')

  const updated: EmployeeBankDetail = {
    ...list[idx],
    status: 'rejected',
    rejection_reason: reason.trim(),
    verified_by: rejectedBy,
    verified_at: now,
    updated_at: now,
  }

  list[idx] = updated
  saveLocalBankDetails(list)

  try {
    await supabase.from('employee_bank_details').update({
      status: 'rejected',
      rejection_reason: reason.trim(),
      updated_at: now,
    }).eq('id', id)
  } catch (err) {
    console.warn('Reject bank detail Supabase notice:', err)
  }

  return updated
}

/**
 * Helper to mask an account number for security (e.g. "•••• •••• 7263")
 */
export function maskAccountNumber(acc: string): string {
  if (!acc) return ''
  const clean = acc.trim()
  if (clean.length <= 4) return clean
  const lastFour = clean.slice(-4)
  const masked = '•'.repeat(Math.min(clean.length - 4, 8))
  return `${masked} ${lastFour}`
}

/**
 * Standard Indian IFSC validation
 * Format: 4 letters (Bank code) + 0 + 6 characters (branch alphanumeric)
 */
export function isValidIFSC(ifsc: string): boolean {
  if (!ifsc) return false
  const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/
  return regex.test(ifsc.trim().toUpperCase())
}
