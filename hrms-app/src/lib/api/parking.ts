import { supabase } from '@/lib/supabase'
import type { ParkingPass } from '@/lib/database.types'

const LOCAL_STORAGE_KEY = 'oklut_db_parking_passes'

// Helper to get local cached passes
function getLocalPasses(): ParkingPass[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
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
      const remoteMap = new Map((data as ParkingPass[]).map((p) => [p.id, p]))
      const merged: ParkingPass[] = [...(data as ParkingPass[])]

      for (const lp of local) {
        if (!remoteMap.has(lp.id)) {
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
  const emailClean = email.trim().toLowerCase()
  try {
    const { data, error } = await supabase
      .from('parking_passes')
      .select('*')
      .ilike('employee_email', emailClean)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      return data[0] as ParkingPass
    }
  } catch (e) {
    console.warn('Supabase fetch failed for employee parking pass:', e)
  }

  // Fallback to local storage
  const local = getLocalPasses()
  const found = local.find(
    (p) =>
      p.employee_email.toLowerCase() === emailClean ||
      (employeeCode && p.employee_code.toLowerCase() === employeeCode.toLowerCase())
  )
  return found || null
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
 * Toggle Gate Check-In / Check-Out
 */
export async function toggleGateCheckIn(passId: string, isCheckedIn: boolean): Promise<void> {
  const now = new Date().toISOString()
  const updates: Partial<ParkingPass> = {
    is_checked_in: isCheckedIn,
    ...(isCheckedIn ? { last_check_in: now } : { last_check_out: now }),
    updated_at: now,
  }

  try {
    await supabase.from('parking_passes').update(updates).eq('id', passId)
  } catch {}

  const local = getLocalPasses().map((p) => (p.id === passId ? { ...p, ...updates } : p))
  saveLocalPasses(local)
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

