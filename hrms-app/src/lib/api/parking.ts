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

    if (error) {
      console.warn('Supabase parking_passes fetch error, falling back to local store:', error.message)
      return getLocalPasses()
    }

    if (data && data.length > 0) {
      saveLocalPasses(data as ParkingPass[])
      return data as ParkingPass[]
    }

    // If remote is empty, check if we have local records
    const local = getLocalPasses()
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
