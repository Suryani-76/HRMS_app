/**
 * EDGE CASE TESTS — Employee Code Generation
 * Tests the employee code prefix building logic with special characters and boundary inputs.
 */
import { describe, it, expect } from 'vitest'

// Mirror the exact logic from employees.ts nextEmployeeCode()
function buildEmployeeCodePrefix(input: {
  country?: string
  state?: string
  city?: string
  branch?: string
  deptName?: string
}): string {
  const deptName = input.deptName ?? 'XX'
  const c = input.country ? input.country.substring(0, 3).toUpperCase() : 'XXX'
  const s = input.state ? input.state.substring(0, 2).toUpperCase() : 'XX'
  const city = input.city ? input.city.substring(0, 3).toUpperCase() : 'XXX'
  const br = input.branch ? input.branch.substring(0, 3).toUpperCase() : 'BR1'
  return `${c}-${s}-${city}-${br}-${deptName}-`
}

function formatEmployeeCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(3, '0')}`
}

describe('Employee Code Prefix — normal cases', () => {
  it('builds standard prefix correctly', () => {
    expect(buildEmployeeCodePrefix({ country: 'India', state: 'Karnataka', city: 'Bangalore', branch: 'BR1', deptName: 'EN' }))
      .toBe('IND-KA-BAN-BR1-EN-')
  })

  it('uses defaults when all inputs are missing', () => {
    expect(buildEmployeeCodePrefix({})).toBe('XXX-XX-XXX-BR1-XX-')
  })

  it('uses defaults for undefined fields', () => {
    expect(buildEmployeeCodePrefix({ country: undefined, state: undefined }))
      .toBe('XXX-XX-XXX-BR1-XX-')
  })
})

describe('Employee Code Prefix — truncation', () => {
  it('truncates country > 3 chars', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'United States', state: 'CA', city: 'LA', branch: 'BR1', deptName: 'HR' })
    expect(prefix.startsWith('UNI-')).toBe(true)
  })

  it('truncates state > 2 chars', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'IN', state: 'Karnataka', city: 'BLR', branch: 'BR1', deptName: 'EN' })
    expect(prefix).toContain('-KA-')
  })

  it('truncates city > 3 chars', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'IN', state: 'KA', city: 'Bangalore', branch: 'BR1', deptName: 'EN' })
    expect(prefix).toContain('-BAN-')
  })

  it('truncates branch > 3 chars', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'IN', state: 'KA', city: 'BLR', branch: 'Branch1234', deptName: 'EN' })
    expect(prefix).toContain('-BRA-')
  })

  it('single char country treated as-is', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'I', state: 'KA', city: 'BLR', branch: 'BR1', deptName: 'EN' })
    expect(prefix.startsWith('I-')).toBe(true)
  })

  it('single char state treated as-is', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'IN', state: 'K', city: 'BLR', branch: 'BR1', deptName: 'EN' })
    expect(prefix).toContain('-K-')
  })
})

describe('Employee Code Prefix — uppercase conversion', () => {
  it('converts lowercase country/state/city/branch to uppercase (deptName passed as-is)', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'india', state: 'ka', city: 'blr', branch: 'br1', deptName: 'en' })
    // Note: deptName is NOT uppercased by the prefix builder - it comes from DB
    expect(prefix).toBe('IND-KA-BLR-BR1-en-')
  })

  it('converts mixed case country/state/city/branch to uppercase', () => {
    const prefix = buildEmployeeCodePrefix({ country: 'iNdIa', state: 'kA', city: 'bLr', branch: 'bR1', deptName: 'En' })
    expect(prefix).toBe('IND-KA-BLR-BR1-En-')
  })
})

describe('Employee Code Sequence Formatting', () => {
  it('pads sequence 1 to "001"', () => {
    const code = formatEmployeeCode('IND-KA-BAN-BR1-EN-', 1)
    expect(code).toBe('IND-KA-BAN-BR1-EN-001')
  })

  it('pads sequence 10 to "010"', () => {
    const code = formatEmployeeCode('IND-KA-BAN-BR1-EN-', 10)
    expect(code).toBe('IND-KA-BAN-BR1-EN-010')
  })

  it('does not pad sequence 100', () => {
    const code = formatEmployeeCode('IND-KA-BAN-BR1-EN-', 100)
    expect(code).toBe('IND-KA-BAN-BR1-EN-100')
  })

  it('handles sequence 0 (should be "000")', () => {
    const code = formatEmployeeCode('IND-KA-BAN-BR1-EN-', 0)
    expect(code).toBe('IND-KA-BAN-BR1-EN-000')
  })

  it('handles large sequence numbers (no truncation)', () => {
    const code = formatEmployeeCode('IND-KA-BAN-BR1-EN-', 9999)
    expect(code).toBe('IND-KA-BAN-BR1-EN-9999')
  })
})
