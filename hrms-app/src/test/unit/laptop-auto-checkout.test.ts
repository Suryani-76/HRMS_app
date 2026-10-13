import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LAPTOP_CLOSED_TIMEOUT_MS,
  getLaptopLidStatus,
  STORAGE_KEY_LID_CLOSED_AT,
} from '@/lib/laptop-auto-checkout'

describe('Laptop Lid Close Auto Check-Out Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('verifies that the auto-checkout timeout threshold is exactly half an hour (30 minutes)', () => {
    expect(LAPTOP_CLOSED_TIMEOUT_MS).toBe(30 * 60 * 1000)
    expect(LAPTOP_CLOSED_TIMEOUT_MS).toBe(1800000)
  })

  it('returns default status when laptop is open and active', () => {
    const status = getLaptopLidStatus()
    expect(status.closedAt).toBeNull()
    expect(status.elapsedMinutes).toBe(0)
  })

  it('tracks elapsed time when laptop lid is closed', () => {
    const twentyMinsAgo = Date.now() - 20 * 60 * 1000
    localStorage.setItem(STORAGE_KEY_LID_CLOSED_AT, String(twentyMinsAgo))

    const status = getLaptopLidStatus()
    expect(status.isClosedOrHidden).toBe(true)
    expect(status.closedAt).toBe(twentyMinsAgo)
    expect(status.elapsedMinutes).toBeGreaterThanOrEqual(20)
  })

  it('identifies when laptop has been closed for 30+ minutes', () => {
    const thirtyFiveMinsAgo = Date.now() - 35 * 60 * 1000
    localStorage.setItem(STORAGE_KEY_LID_CLOSED_AT, String(thirtyFiveMinsAgo))

    const status = getLaptopLidStatus()
    expect(status.elapsedMinutes).toBeGreaterThanOrEqual(35)
    expect(status.elapsedMinutes * 60 * 1000).toBeGreaterThanOrEqual(LAPTOP_CLOSED_TIMEOUT_MS)
  })

  it('guarantees executeLaptopAutoCheckOut is permanently disabled and returns false', async () => {
    const { executeLaptopAutoCheckOut } = await import('@/lib/laptop-auto-checkout')
    const result = await executeLaptopAutoCheckOut('test-emp-123')
    expect(result).toBe(false)
  })
})
