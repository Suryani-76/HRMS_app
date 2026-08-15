/**
 * UNIT TESTS — database.types.ts
 * Tests ROLES constant, isAdminRole(), isManagerRole()
 */
import { describe, it, expect } from 'vitest'
import { ROLES, isAdminRole, isManagerRole } from '@/lib/database.types'

describe('ROLES constant', () => {
  it('has Admin', () => expect(ROLES.ADMIN).toBe('Admin'))
  it('has HR', () => expect(ROLES.HR).toBe('HR'))
  it('has Manager', () => expect(ROLES.MANAGER).toBe('Manager'))
  it('has Employee', () => expect(ROLES.EMPLOYEE).toBe('Employee'))
})

describe('isAdminRole', () => {
  it('returns true for Admin', () => {
    expect(isAdminRole('Admin')).toBe(true)
  })
  it('returns false for HR', () => {
    expect(isAdminRole('HR')).toBe(false)
  })
  it('returns false for Manager', () => {
    expect(isAdminRole('Manager')).toBe(false)
  })
  it('returns false for Employee', () => {
    expect(isAdminRole('Employee')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })
  it('is case-sensitive (lowercase admin is false)', () => {
    expect(isAdminRole('admin')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isAdminRole('')).toBe(false)
  })
  it('returns false for arbitrary unknown role', () => {
    expect(isAdminRole('SuperAdmin')).toBe(false)
  })
})

describe('isManagerRole', () => {
  it('returns true for Admin', () => {
    expect(isManagerRole('Admin')).toBe(true)
  })
  it('returns true for HR', () => {
    expect(isManagerRole('HR')).toBe(true)
  })
  it('returns true for Manager', () => {
    expect(isManagerRole('Manager')).toBe(true)
  })
  it('returns false for Employee', () => {
    expect(isManagerRole('Employee')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isManagerRole(null)).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isManagerRole(undefined)).toBe(false)
  })
  it('is case-sensitive (lowercase manager is false)', () => {
    expect(isManagerRole('manager')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isManagerRole('')).toBe(false)
  })
})
