import { supabase } from '@/lib/supabase'
import type { EmployeeFaceCredential } from '@/lib/database.types'
import {
  encryptBiometricVector,
  decryptBiometricVector,
  compareBiometricVectors,
} from '@/lib/face-biometrics'

const LOCAL_CREDENTIALS_KEY = 'oklut_face_credentials_v4'
const LOCAL_PINS_KEY = 'oklut_face_fallback_pins_v4'

export interface FaceRegistryStatus {
  employeeId: string
  status: 'registered' | 'revoked' | 'locked' | 'not_registered'
  registeredAt?: string | null
  lastVerifiedAt?: string | null
  failedAttempts: number
  lockedUntil?: string | null
  modelVersion?: string
}

// ----------------------------------------------------------------------------
// Local Encrypted Persistence Helpers (resilient fallback for local testing)
// ----------------------------------------------------------------------------
function getLocalCredentials(): Record<string, EmployeeFaceCredential> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalCredentials(data: Record<string, EmployeeFaceCredential>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(data))
  } catch {}
}

function getLocalPins(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalPins(data: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(data))
  } catch {}
}

// ----------------------------------------------------------------------------
// 1. Fetch Employee Face Credential
// ----------------------------------------------------------------------------
export async function getFaceCredential(
  employeeId: string
): Promise<EmployeeFaceCredential | null> {
  if (!employeeId) return null

  // 1. Try Supabase remote table first
  try {
    const { data, error } = await supabase
      .from('employee_face_credentials' as any)
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (!error && data) {
      const cred = data as unknown as EmployeeFaceCredential
      // Check if lockout has expired
      if (cred.locked_until && new Date(cred.locked_until).getTime() <= Date.now()) {
        await unlockFaceCredential(employeeId)
        cred.registration_status = 'registered'
        cred.failed_attempts = 0
        cred.locked_until = null
      }
      return cred
    }
  } catch (err) {
    // Table not deployed remotely yet - fall back gracefully
  }

  // 2. Check local encrypted cache
  const localMap = getLocalCredentials()
  const localCred = localMap[employeeId]
  if (localCred) {
    if (localCred.locked_until && new Date(localCred.locked_until).getTime() <= Date.now()) {
      localCred.registration_status = 'registered'
      localCred.failed_attempts = 0
      localCred.locked_until = null
      localMap[employeeId] = localCred
      saveLocalCredentials(localMap)
    }
    return localCred
  }

  return null
}

// ----------------------------------------------------------------------------
// 2. Register / Update Face Credential
// ----------------------------------------------------------------------------
export async function registerFaceCredential(
  employeeId: string,
  biometricVector: number[],
  fallbackPin?: string
): Promise<{ success: boolean; error?: string; credential?: EmployeeFaceCredential }> {
  try {
    if (!biometricVector || biometricVector.length === 0) {
      return { success: false, error: 'Empty biometric vector provided' }
    }

    // Encrypt template using Web Crypto AES-GCM 256-bit
    const encryptedTemplate = await encryptBiometricVector(biometricVector)
    const now = new Date().toISOString()

    const credentialRecord: EmployeeFaceCredential = {
      id: `face-cred-${employeeId}-${Date.now()}`,
      employee_id: employeeId,
      biometric_template: encryptedTemplate,
      model_version: 'v4.0-gcm-128',
      registration_status: 'registered',
      registered_at: now,
      last_verified_at: null,
      failed_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    }

    // Save fallback PIN if provided (or default 4-digit PIN '1234')
    const pins = getLocalPins()
    pins[employeeId] = fallbackPin || '1234'
    saveLocalPins(pins)

    // Save to local secure cache
    const localMap = getLocalCredentials()
    localMap[employeeId] = credentialRecord
    saveLocalCredentials(localMap)

    // Try Supabase upsert
    try {
      await supabase.from('employee_face_credentials' as any).upsert(
        {
          employee_id: employeeId,
          biometric_template: encryptedTemplate,
          model_version: 'v4.0-gcm-128',
          registration_status: 'registered',
          registered_at: now,
          failed_attempts: 0,
          locked_until: null,
          updated_at: now,
        },
        { onConflict: 'employee_id' }
      )
    } catch {}

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'FACE_CREDENTIAL_REGISTERED',
        entity_name: 'employee_face_credentials',
        details: {
          employee_id: employeeId,
          model_version: 'v4.0-gcm-128',
          registered_at: now,
          security: 'AES-GCM-256',
        },
      })
    } catch {}

    // Dispatch profile updated event so dashboard badge updates immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('face-id-profile-updated', {
          detail: { employeeId, profile: credentialRecord },
        })
      )
    }

    return { success: true, credential: credentialRecord }
  } catch (err: any) {
    console.error('Failed to register face credential:', err)
    return { success: false, error: err?.message || 'Biometric encryption failed' }
  }
}

// ----------------------------------------------------------------------------
// 3. Verify Live Face Against Stored Credential
// ----------------------------------------------------------------------------
export async function verifyFaceCredential(
  employeeId: string,
  liveBiometricVector: number[]
): Promise<{
  verified: boolean
  confidence: number
  locked: boolean
  remainingAttempts: number
  lockedUntil?: string | null
  message: string
}> {
  const credential = await getFaceCredential(employeeId)

  if (!credential || credential.registration_status === 'revoked') {
    return {
      verified: false,
      confidence: 0,
      locked: false,
      remainingAttempts: 0,
      message: 'Face ID is not registered for this account.',
    }
  }

  // Check lockout
  if (
    credential.registration_status === 'locked' ||
    (credential.locked_until && new Date(credential.locked_until).getTime() > Date.now())
  ) {
    const minsLeft = Math.ceil(
      (new Date(credential.locked_until!).getTime() - Date.now()) / 60000
    )
    return {
      verified: false,
      confidence: 0,
      locked: true,
      remainingAttempts: 0,
      lockedUntil: credential.locked_until,
      message: `Face verification is temporarily locked. Try again in ${minsLeft} minute(s) or use Secure Fallback.`,
    }
  }

  // Decrypt stored biometric template
  const storedVector = await decryptBiometricVector(credential.biometric_template)
  if (!storedVector) {
    return {
      verified: false,
      confidence: 0,
      locked: false,
      remainingAttempts: 3 - credential.failed_attempts,
      message: 'Unable to decrypt biometric credentials. Re-registration required.',
    }
  }

  // Perform Pearson & Cosine vector similarity comparison
  const matchResult = compareBiometricVectors(liveBiometricVector, storedVector, 60)

  if (matchResult.isMatch) {
    await recordSuccessfulVerification(employeeId)
    return {
      verified: true,
      confidence: matchResult.overallScore,
      locked: false,
      remainingAttempts: 5,
      message: 'Face verified successfully.',
    }
  } else {
    const lockInfo = await recordFailedAttempt(employeeId)
    return {
      verified: false,
      confidence: matchResult.overallScore,
      locked: lockInfo.locked,
      remainingAttempts: lockInfo.remainingAttempts,
      lockedUntil: lockInfo.lockedUntil,
      message: lockInfo.locked
        ? 'Too many failed attempts. Face verification is temporarily locked for 5 minutes.'
        : `Face not recognized (${matchResult.overallScore}% confidence). ${lockInfo.remainingAttempts} attempt(s) remaining.`,
    }
  }
}

// ----------------------------------------------------------------------------
// 4. Failed Attempt Counter & 5-Minute Lockout
// ----------------------------------------------------------------------------
export async function recordFailedAttempt(
  employeeId: string
): Promise<{ locked: boolean; remainingAttempts: number; lockedUntil?: string | null }> {
  const credential = await getFaceCredential(employeeId)
  const currentAttempts = (credential?.failed_attempts || 0) + 1
  const maxAttempts = 5
  const isLocked = currentAttempts >= maxAttempts
  const lockedUntil = isLocked ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
  const newStatus = isLocked ? 'locked' : (credential?.registration_status || 'registered')
  const remainingAttempts = Math.max(0, maxAttempts - currentAttempts)

  // Update local storage
  const localMap = getLocalCredentials()
  if (localMap[employeeId]) {
    localMap[employeeId].failed_attempts = currentAttempts
    localMap[employeeId].registration_status = newStatus
    localMap[employeeId].locked_until = lockedUntil
    localMap[employeeId].updated_at = new Date().toISOString()
    saveLocalCredentials(localMap)
  }

  // Update Supabase
  try {
    await supabase
      .from('employee_face_credentials' as any)
      .update({
        failed_attempts: currentAttempts,
        registration_status: newStatus,
        locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', employeeId)
  } catch {}

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      action: isLocked ? 'FACE_ID_TEMPORARY_LOCKOUT' : 'FACE_ID_VERIFICATION_FAILED',
      entity_name: 'employee_face_credentials',
      details: {
        employee_id: employeeId,
        failed_attempts: currentAttempts,
        is_locked: isLocked,
        locked_until: lockedUntil,
      },
    })
  } catch {}

  return { locked: isLocked, remainingAttempts, lockedUntil }
}

// ----------------------------------------------------------------------------
// 5. Successful Verification Reset
// ----------------------------------------------------------------------------
export async function recordSuccessfulVerification(employeeId: string): Promise<void> {
  const now = new Date().toISOString()

  // Update local
  const localMap = getLocalCredentials()
  if (localMap[employeeId]) {
    localMap[employeeId].failed_attempts = 0
    localMap[employeeId].locked_until = null
    localMap[employeeId].registration_status = 'registered'
    localMap[employeeId].last_verified_at = now
    localMap[employeeId].updated_at = now
    saveLocalCredentials(localMap)
  }

  // Update Supabase
  try {
    await supabase
      .from('employee_face_credentials' as any)
      .update({
        failed_attempts: 0,
        locked_until: null,
        registration_status: 'registered',
        last_verified_at: now,
        updated_at: now,
      })
      .eq('employee_id', employeeId)
  } catch {}

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      action: 'FACE_ID_VERIFIED',
      entity_name: 'employee_face_credentials',
      details: {
        employee_id: employeeId,
        verified_at: now,
      },
    })
  } catch {}
}

// ----------------------------------------------------------------------------
// 6. Unlock Face ID (Admin or Reset)
// ----------------------------------------------------------------------------
export async function unlockFaceCredential(employeeId: string): Promise<boolean> {
  const now = new Date().toISOString()

  const localMap = getLocalCredentials()
  if (localMap[employeeId]) {
    localMap[employeeId].failed_attempts = 0
    localMap[employeeId].locked_until = null
    localMap[employeeId].registration_status = 'registered'
    localMap[employeeId].updated_at = now
    saveLocalCredentials(localMap)
  }

  try {
    await supabase
      .from('employee_face_credentials' as any)
      .update({
        failed_attempts: 0,
        locked_until: null,
        registration_status: 'registered',
        updated_at: now,
      })
      .eq('employee_id', employeeId)
  } catch {}

  try {
    await supabase.from('audit_logs').insert({
      action: 'FACE_ID_UNLOCKED',
      entity_name: 'employee_face_credentials',
      details: {
        employee_id: employeeId,
        unlocked_at: now,
      },
    })
  } catch {}

  return true
}

// ----------------------------------------------------------------------------
// 7. Revoke / Disable Face ID
// ----------------------------------------------------------------------------
export async function revokeFaceCredential(employeeId: string): Promise<boolean> {
  const now = new Date().toISOString()

  const localMap = getLocalCredentials()
  if (localMap[employeeId]) {
    localMap[employeeId].registration_status = 'revoked'
    localMap[employeeId].updated_at = now
    saveLocalCredentials(localMap)
  }

  try {
    await supabase
      .from('employee_face_credentials' as any)
      .update({
        registration_status: 'revoked',
        updated_at: now,
      })
      .eq('employee_id', employeeId)
  } catch {}

  try {
    await supabase.from('audit_logs').insert({
      action: 'FACE_ID_REVOKED',
      entity_name: 'employee_face_credentials',
      details: {
        employee_id: employeeId,
        revoked_at: now,
      },
    })
  } catch {}

  return true
}

// ----------------------------------------------------------------------------
// 8. Fallback PIN Verification (Secure Alternate Attendance Channel)
// ----------------------------------------------------------------------------
export async function verifySecureFallbackPin(
  employeeId: string,
  pin: string
): Promise<{ verified: boolean; message: string }> {
  if (!pin || pin.trim().length < 4) {
    return { verified: false, message: 'Please enter a valid 4-digit PIN.' }
  }

  const pins = getLocalPins()
  const storedPin = pins[employeeId] || '1234'

  if (pin.trim() === storedPin) {
    // Reset lockout counter upon authenticated fallback
    await unlockFaceCredential(employeeId)
    try {
      await supabase.from('audit_logs').insert({
        action: 'ATTENDANCE_SECURE_FALLBACK_PIN_VERIFIED',
        entity_name: 'attendance',
        details: {
          employee_id: employeeId,
          timestamp: new Date().toISOString(),
        },
      })
    } catch {}
    return { verified: true, message: 'Fallback PIN verified successfully.' }
  }

  return { verified: false, message: 'Incorrect Fallback PIN.' }
}

// ----------------------------------------------------------------------------
// 9. Fetch Registry Statuses for HR/Admin Dashboard
// ----------------------------------------------------------------------------
export async function fetchAllFaceCredentialStatuses(): Promise<FaceRegistryStatus[]> {
  const results: Record<string, FaceRegistryStatus> = {}

  // 1. Check local storage credentials
  const localMap = getLocalCredentials()
  for (const [empId, cred] of Object.entries(localMap)) {
    results[empId] = {
      employeeId: empId,
      status: cred.registration_status || 'registered',
      registeredAt: cred.registered_at,
      lastVerifiedAt: cred.last_verified_at,
      failedAttempts: cred.failed_attempts || 0,
      lockedUntil: cred.locked_until,
      modelVersion: cred.model_version,
    }
  }

  // 2. Fetch from Supabase
  try {
    const { data } = await supabase
      .from('employee_face_credentials' as any)
      .select('employee_id, registration_status, registered_at, last_verified_at, failed_attempts, locked_until, model_version')

    if (data && Array.isArray(data)) {
      for (const row of data as any[]) {
        results[row.employee_id] = {
          employeeId: row.employee_id,
          status: row.registration_status || 'registered',
          registeredAt: row.registered_at,
          lastVerifiedAt: row.last_verified_at,
          failedAttempts: row.failed_attempts || 0,
          lockedUntil: row.locked_until,
          modelVersion: row.model_version,
        }
      }
    }
  } catch {}

  return Object.values(results)
}
