import { supabase } from '@/lib/supabase'
import type { ParkingPass } from '@/lib/database.types'

const LOCAL_STORAGE_KEY = 'oklut_db_parking_passes'

export const INITIAL_SAMPLE_PASSES: ParkingPass[] = [
  {
    id: 'pass-sample-hr',
    employee_id: 'emp-sample-hr',
    employee_code: 'OKL-HR-001',
    employee_name: 'HR Administrator',
    employee_email: 'hr@oklut.com',
    vehicle_type: '4-Wheeler',
    vehicle_number: 'TS09EA2026',
    vehicle_model: 'Hyundai Creta (White)',
    license_number: 'TS0920210001234',
    emergency_phone: '9876543210',
    status: 'Approved',
    allocated_sector: 'Sector 4W - Basement 1',
    allocated_slot: 'Slot P-4W-B1-01',
    rejection_reason: null,
    approved_by: 'HR Admin',
    approved_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    qr_code_data: 'OKLUT-PARKING-PASS:hr@oklut.com:TS09EA2026:Slot P-4W-B1-01',
    qr_code_image: '',
    is_checked_in: true,
    last_check_in: new Date(Date.now() - 3 * 3600000).toISOString(),
    last_check_out: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'pass-sample-surya',
    employee_id: 'emp-sample-surya',
    employee_code: 'OKL-GEN-2026-164',
    employee_name: 'Gouda Suryani',
    employee_email: 's.guda@oklut.com',
    vehicle_type: '2-Wheeler',
    vehicle_number: 'TS07FA4751',
    vehicle_model: 'Royal Enfield Hunter 350',
    license_number: 'TS0720220005678',
    emergency_phone: '9848012345',
    status: 'Approved',
    allocated_sector: 'Sector 2W - Ground Bay',
    allocated_slot: 'Slot P-2W-G-14',
    rejection_reason: null,
    approved_by: 'HR Admin',
    approved_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    qr_code_data: 'OKLUT-PARKING-PASS:s.guda@oklut.com:TS07FA4751:Slot P-2W-G-14',
    qr_code_image: '',
    is_checked_in: false,
    last_check_in: new Date(Date.now() - 28 * 3600000).toISOString(),
    last_check_out: new Date(Date.now() - 20 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
  {
    id: 'pass-sample-rahul',
    employee_id: 'emp-sample-rahul',
    employee_code: 'OKL-ENG-2026-042',
    employee_name: 'Rahul Sharma',
    employee_email: 'rahul.s@oklut.com',
    vehicle_type: '4-Wheeler',
    vehicle_number: 'MH12AB9876',
    vehicle_model: 'Tata Nexon EV (Dark Edition)',
    license_number: 'MH1220200007890',
    emergency_phone: '9123456789',
    status: 'Pending',
    allocated_sector: null,
    allocated_slot: null,
    rejection_reason: null,
    approved_by: null,
    approved_at: null,
    qr_code_data: null,
    qr_code_image: null,
    is_checked_in: false,
    last_check_in: null,
    last_check_out: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
]

// Helper to get local cached passes
function getLocalPasses(): ParkingPass[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_PASSES))
      return INITIAL_SAMPLE_PASSES
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_PASSES))
    return INITIAL_SAMPLE_PASSES
  } catch {
    return INITIAL_SAMPLE_PASSES
  }
}

// Helper to save local cached passes
function saveLocalPasses(passes: ParkingPass[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(passes))
  } catch (e) {
    console.error('Failed to cache parking passes locally:', e)
  }
}

/**
 * Fetch all parking passes (for HR / Admin Approval Sector)
 */
export async function fetchAllParkingPasses(): Promise<ParkingPass[]> {
  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .select('*')
      .order('created_at', { ascending: false })

    const local = getLocalPasses()

    if (error) {
      console.warn('Supabase parking_passes fetch error, falling back to local store:', error.message)
      return local
    }

    if (data && data.length > 0) {
      // Merge remote with local passes by id to avoid dropping local records
      const localMap = new Map(local.map((p) => [p.id, p]))
      const merged: ParkingPass[] = (data as ParkingPass[]).map((remote) => {
        const localRecord = localMap.get(remote.id)
        if (localRecord && localRecord.updated_at && remote.updated_at) {
          const localTime = new Date(localRecord.updated_at).getTime()
          const remoteTime = new Date(remote.updated_at).getTime()
          if (localTime >= remoteTime) {
            return { ...remote, ...localRecord }
          }
        }
        return remote
      })

      for (const lp of local) {
        if (!merged.some((m) => m.id === lp.id)) {
          merged.push(lp)
        }
      }

      // Sort newest created_at first
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      saveLocalPasses(merged)
      return merged
    }

    // If remote is empty, check if we have local records
    return local
  } catch (err) {
    console.warn('Using local fallback for parking passes:', err)
    return getLocalPasses()
  }
}

/**
 * Fetch parking pass for a specific employee by email or employee code
 */
export async function fetchParkingPassByEmployee(email: string, employeeCode?: string): Promise<ParkingPass | null> {
  const emailClean = (email || '').trim().toLowerCase()
  const codeClean = (employeeCode || '').trim().toLowerCase()
  const local = getLocalPasses()
  const localFound = local.find(
    (p) =>
      (emailClean && p.employee_email?.toLowerCase() === emailClean) ||
      (codeClean && p.employee_code?.toLowerCase() === codeClean) ||
      ((emailClean === 'hr@oklut.com' || emailClean.startsWith('hr@')) &&
        (p.employee_email?.toLowerCase() === 'hr@oklut.com' || p.employee_email?.toLowerCase().startsWith('hr@')))
  )

  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .select('*')
      .ilike('employee_email', emailClean)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      const remote = data[0] as ParkingPass
      if (localFound && localFound.id === remote.id && localFound.updated_at) {
        const localTime = new Date(localFound.updated_at).getTime()
        const remoteTime = new Date(remote.updated_at || 0).getTime()
        if (localTime >= remoteTime) {
          return { ...remote, ...localFound }
        }
      }
      return remote
    }
  } catch (e) {
    console.warn('Supabase fetch failed for employee parking pass:', e)
  }

  // Fallback to local storage
  return localFound || null
}

/**
 * Submit a new vehicle registration request (from Employee Sector)
 */
export async function submitVehicleParkingRequest(
  payload: Omit<ParkingPass, 'id' | 'created_at' | 'status' | 'is_checked_in'>
): Promise<ParkingPass> {
  const newPass: ParkingPass = {
    ...payload,
    id: crypto.randomUUID ? crypto.randomUUID() : `pass_${Date.now()}`,
    status: 'Pending',
    is_checked_in: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Try saving to Supabase
  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .insert({
        id: newPass.id,
        employee_id: newPass.employee_id,
        employee_code: newPass.employee_code,
        employee_name: newPass.employee_name,
        employee_email: newPass.employee_email,
        vehicle_type: newPass.vehicle_type,
        vehicle_number: newPass.vehicle_number,
        vehicle_model: newPass.vehicle_model || null,
        license_number: newPass.license_number || null,
        emergency_phone: newPass.emergency_phone || null,
        status: 'Pending',
        is_checked_in: false,
      })
      .select('*')
      .single()

    if (!error && data) {
      // Update local storage too
      const local = getLocalPasses().filter((p) => p.employee_id !== newPass.employee_id)
      saveLocalPasses([data as ParkingPass, ...local])
      return data as ParkingPass
    }
  } catch (err) {
    console.warn('Supabase insert failed, saving to local state:', err)
  }

  // Fallback save locally
  const local = getLocalPasses().filter((p) => p.employee_id !== newPass.employee_id)
  const updated = [newPass, ...local]
  saveLocalPasses(updated)
  return newPass
}

/**
 * Approve parking pass and persist generated QR code (from HR & Admin Sector)
 */
export async function approveParkingPassRequest(
  passId: string,
  sector: string,
  slot: string,
  approverId: string,
  qrCodeData: string,
  qrCodeImage: string
): Promise<ParkingPass> {
  const now = new Date().toISOString()
  const updates = {
    status: 'Approved' as const,
    allocated_sector: sector,
    allocated_slot: slot,
    approved_by: approverId,
    approved_at: now,
    qr_code_data: qrCodeData,
    qr_code_image: qrCodeImage,
    updated_at: now,
  }

  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .update(updates)
      .eq('id', passId)
      .select('*')
      .single()

    if (!error && data) {
      const local = getLocalPasses().map((p) => (p.id === passId ? (data as ParkingPass) : p))
      saveLocalPasses(local)
      return data as ParkingPass
    }
  } catch (err) {
    console.warn('Supabase update failed for approval, updating local state:', err)
  }

  // Fallback update in local storage
  const local = getLocalPasses().map((p) => (p.id === passId ? { ...p, ...updates } : p))
  saveLocalPasses(local)
  const updatedPass = local.find((p) => p.id === passId)!
  return updatedPass
}

/**
 * Reject parking pass with reason (from HR & Admin Sector)
 */
export async function rejectParkingPassRequest(
  passId: string,
  reason: string,
  rejectorId: string
): Promise<ParkingPass> {
  const now = new Date().toISOString()
  const updates = {
    status: 'Rejected' as const,
    rejection_reason: reason,
    approved_by: rejectorId,
    approved_at: now,
    updated_at: now,
  }

  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .update(updates)
      .eq('id', passId)
      .select('*')
      .single()

    if (!error && data) {
      const local = getLocalPasses().map((p) => (p.id === passId ? (data as ParkingPass) : p))
      saveLocalPasses(local)
      return data as ParkingPass
    }
  } catch (err) {
    console.warn('Supabase update failed for rejection, updating local state:', err)
  }

  const local = getLocalPasses().map((p) => (p.id === passId ? { ...p, ...updates } : p))
  saveLocalPasses(local)
  const updatedPass = local.find((p) => p.id === passId)!
  return updatedPass
}

/**
 * Toggle Gate Check-In / Check-Out (Gate Entry & Exit)
 */
export async function toggleGateCheckIn(passId: string, isCheckedIn: boolean): Promise<ParkingPass | null> {
  const now = new Date().toISOString()
  const updates: Partial<ParkingPass> = {
    is_checked_in: isCheckedIn,
    ...(isCheckedIn ? { last_check_in: now } : { last_check_out: now }),
    updated_at: now,
  }

  // Update in localStorage immediately
  const local = getLocalPasses()
  let updatedPass: ParkingPass | null = null
  const updatedList = local.map((p) => {
    if (p.id === passId) {
      updatedPass = { ...p, ...updates }
      return updatedPass
    }
    return p
  })

  if (updatedPass) {
    saveLocalPasses(updatedList)
  }

  // Attempt Supabase update
  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .update(updates)
      .eq('id', passId)
      .select('*')
      .single()

    if (!error && data) {
      updatedPass = data as ParkingPass
      saveLocalPasses(local.map((p) => (p.id === passId ? (data as ParkingPass) : p)))
      return updatedPass
    }
  } catch (err) {
    console.warn('Supabase toggleGateCheckIn error, fallback to local store:', err)
  }

  return updatedPass
}

export const INDIAN_STATE_RTO_MAP: Record<string, string> = {
  TS: 'Telangana',
  AP: 'Andhra Pradesh',
  MH: 'Maharashtra',
  DL: 'Delhi',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  KL: 'Kerala',
  GJ: 'Gujarat',
  RJ: 'Rajasthan',
  UP: 'Uttar Pradesh',
  MP: 'Madhya Pradesh',
  HR: 'Haryana',
  PB: 'Punjab',
  WB: 'West Bengal',
  OD: 'Odisha',
  BR: 'Bihar',
  JH: 'Jharkhand',
  CH: 'Chandigarh',
  GA: 'Goa',
  AS: 'Assam',
  UK: 'Uttarakhand',
  HP: 'Himachal Pradesh',
  JK: 'Jammu & Kashmir',
  PY: 'Puducherry',
}

/**
 * Standard Indian Vehicle Registration Validation
 * Format: 2-letter state code + 1-2 digit district + 0-3 letters series + 4 digits
 * Or Bharat Series (BH): 2 digits + BH + 4 digits + 1-2 letters
 */
export function isValidVehicleNumber(vNum: string): boolean {
  if (!vNum) return false
  const clean = vNum.replace(/[\s-]/g, '').toUpperCase()
  // Standard Indian plate: e.g. TS09EA1234, DL01A1234, MH12AB5678
  const standardRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/
  // Bharat series: e.g. 22BH1234AB
  const bhSeriesRegex = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/

  return standardRegex.test(clean) || bhSeriesRegex.test(clean)
}

/**
 * Get state name from registration plate
 */
export function getStateFromPlate(vNum: string): string | null {
  if (!vNum || vNum.length < 2) return null
  const clean = vNum.replace(/[\s-]/g, '').toUpperCase()
  if (/^[0-9]{2}BH/.test(clean)) return 'Bharat Series (All-India BH)'
  const stateCode = clean.slice(0, 2)
  return INDIAN_STATE_RTO_MAP[stateCode] || null
}

/**
 * Standard Indian Driving License Validation
 * Typically: 2-letter state code + 2-digit RTO + 4-digit year + 7-digit unique number (13 to 16 alphanumeric characters)
 */
export function isValidDrivingLicense(dl: string): boolean {
  if (!dl) return false
  const clean = dl.replace(/[\s-]/g, '').toUpperCase()
  const dlRegex = /^[A-Z]{2}[0-9A-Z]{11,15}$/
  return dlRegex.test(clean)
}

/**
 * Standard Indian Phone Number Validation (10 digits, optionally with +91)
 */
export function isValidEmergencyPhone(phone: string): boolean {
  if (!phone) return false
  const clean = phone.replace(/[\s-]/g, '')
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/
  return phoneRegex.test(clean)
}

