// Mock interview-slot service — localStorage-backed so booked_count survives
// reloads. Every method is async and side-effect-free from React, so these can be
// swapped 1:1 for real Supabase / Prisma / API-route implementations later.

export type RoundType = 'technical' | 'hr'

export interface InterviewSlot {
  id: string
  slot_key: string
  round_type: RoundType
  date_time: string
  max_count: number
  booked_count: number
}

export interface CandidateSchedule {
  candidate_id: string
  exam_start_date?: string | null
  exam_end_date?: string | null
  technical_interview_date?: string | null
  hr_interview_date?: string | null
}

export interface SlotSeed {
  slot_key: string
  date_time: string
  max_count: number
}

interface PoolEntry {
  slot_key: string
  round_type: RoundType
  date_time: string
  max_count: number
}

const POOL_PREFIX = 'hrms_slot_pool'
const BOOKING_PREFIX = 'hrms_slot_bookings'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode / SSR) — pool works for this session only.
  }
}

const poolKey = (roundType: RoundType, jobId?: string) =>
  `${POOL_PREFIX}_${roundType}${jobId ? `_${jobId}` : ''}`

const bookingKey = (roundType: RoundType, jobId?: string) =>
  `${BOOKING_PREFIX}_${roundType}${jobId ? `_${jobId}` : ''}`

function seedPool(roundType: RoundType, jobId?: string, seed?: SlotSeed[]): PoolEntry[] {
  let pool = read<PoolEntry[]>(poolKey(roundType, jobId))
  if (pool && pool.length > 0) return pool

  if (seed && seed.length > 0) {
    pool = seed.map((s) => ({ slot_key: s.slot_key, round_type: roundType, date_time: s.date_time, max_count: s.max_count }))
  } else {
    // Default demo pool — one slot per day at 10:00 local time.
    const base = new Date()
    base.setHours(10, 0, 0, 0)
    pool = [1, 2, 3].map((i) => ({
      slot_key: `${roundType}_slot_${i}`,
      round_type: roundType,
      date_time: new Date(base.getTime() + i * 24 * 60 * 60 * 1000).toISOString(),
      max_count: 5,
    }))
  }
  write(poolKey(roundType, jobId), pool)
  return pool
}

/**
 * Resolve the live slot pool for a round. `claimed` maps slot_key → number of
 * candidates already bound to that slot through the real DB (published rows),
 * so capacity stays accurate even before this candidate books anything.
 */
export async function getAvailableSlots(
  roundType: RoundType,
  opts: { jobId?: string; seed?: SlotSeed[]; claimed?: Record<string, number> } = {}
): Promise<InterviewSlot[]> {
  const pool = seedPool(roundType, opts.jobId, opts.seed)
  const bindings = read<Record<string, string>>(bookingKey(roundType, opts.jobId)) ?? {}

  const counted: Record<string, number> = { ...(opts.claimed ?? {}) }
  for (const candidateId of Object.keys(bindings)) {
    const slotKey = bindings[candidateId]
    counted[slotKey] = (counted[slotKey] ?? 0) + 1
  }

  return pool
    .map((entry) => ({
      id: entry.slot_key,
      slot_key: entry.slot_key,
      round_type: entry.round_type,
      date_time: entry.date_time,
      max_count: entry.max_count,
      booked_count: counted[entry.slot_key] ?? 0,
    }))
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
}

/** Bind a candidate to a slot (increments that slot's booked_count). */
export async function bookSlot(
  candidateId: string,
  slotKey: string,
  roundType: RoundType,
  opts: { jobId?: string }
): Promise<InterviewSlot> {
  const key = bookingKey(roundType, opts.jobId)
  const bindings = read<Record<string, string>>(key) ?? {}
  bindings[candidateId] = slotKey
  write(key, bindings)

  const slots = await getAvailableSlots(roundType, opts)
  const slot = slots.find((s) => s.slot_key === slotKey)
  if (!slot) throw new Error(`Slot ${slotKey} not found in pool`)
  return slot
}

/**
 * Move a candidate from one slot to another — decrements the old slot's
 * booked_count and increments the new slot's booked_count atomically.
 */
export async function rescheduleSlot(
  candidateId: string,
  oldSlotKey: string,
  newSlotKey: string,
  roundType: RoundType,
  opts: { jobId?: string }
): Promise<InterviewSlot> {
  const key = bookingKey(roundType, opts.jobId)
  const bindings = read<Record<string, string>>(key) ?? {}
  if (bindings[candidateId] === oldSlotKey) {
    delete bindings[candidateId]
  }
  bindings[candidateId] = newSlotKey
  write(key, bindings)

  const slots = await getAvailableSlots(roundType, opts)
  const slot = slots.find((s) => s.slot_key === newSlotKey)
  if (!slot) throw new Error(`Slot ${newSlotKey} not found in pool`)
  return slot
}

/** Cancel a candidate's booking — decrements the previously bound slot. */
export async function releaseSlot(
  candidateId: string,
  roundType: RoundType,
  opts: { jobId?: string }
): Promise<string | null> {
  const key = bookingKey(roundType, opts.jobId)
  const bindings = read<Record<string, string>>(key) ?? {}
  const prev = bindings[candidateId] ?? null
  delete bindings[candidateId]
  write(key, bindings)
  return prev
}