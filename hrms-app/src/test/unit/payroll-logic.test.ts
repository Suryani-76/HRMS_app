/**
 * UNIT TESTS — Payroll business logic
 * Extracted salary computation logic from generatePayroll() in lib/api/core.ts
 * Tests the math in isolation without Supabase.
 */
import { describe, it, expect } from 'vitest'

// ─── Re-implement the core salary calculation ───────────────────────────────
// This mirrors exactly what generatePayroll() does in lib/api/core.ts
interface PayrollInput {
  basic_salary: number
  hra: number
  allowances: number
  bonus: number
  pf_percent: number
  tax_percent: number
  present_days: number
  total_days: number
  unpaid_leave_days: number
}

function computePayroll(p: PayrollInput) {
  const basic = Number(p.basic_salary) || 0
  const hra = Number(p.hra) || 0
  const allowances = Number(p.allowances) || 0
  const bonus = Number(p.bonus) || 0
  const daily = p.total_days > 0 ? basic / p.total_days : 0
  const leaveDeduction = daily * p.unpaid_leave_days
  const deductions = Number(leaveDeduction.toFixed(2))
  const pf = Number((((basic + hra) * (Number(p.pf_percent) || 0)) / 100).toFixed(2))
  const gross = basic + hra + allowances + bonus
  const tax = Number(((gross * (Number(p.tax_percent) || 0)) / 100).toFixed(2))
  const net = Number((gross - deductions - pf - tax).toFixed(2))
  return { gross, deductions, pf, tax, net }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Payroll Computation — computePayroll()', () => {
  const base: PayrollInput = {
    basic_salary: 50000,
    hra: 20000,
    allowances: 5000,
    bonus: 2000,
    pf_percent: 12,
    tax_percent: 10,
    present_days: 30,
    total_days: 30,
    unpaid_leave_days: 0,
  }

  it('calculates gross salary correctly', () => {
    const { gross } = computePayroll(base)
    // 50000 + 20000 + 5000 + 2000 = 77000
    expect(gross).toBe(77000)
  })

  it('calculates PF based on basic+HRA', () => {
    const { pf } = computePayroll(base)
    // (50000 + 20000) * 12% = 8400
    expect(pf).toBe(8400)
  })

  it('calculates tax based on gross salary', () => {
    const { tax } = computePayroll(base)
    // 77000 * 10% = 7700
    expect(tax).toBe(7700)
  })

  it('calculates net salary (no leave deductions)', () => {
    const { net } = computePayroll(base)
    // 77000 - 0 - 8400 - 7700 = 60900
    expect(net).toBe(60900)
  })

  it('calculates unpaid leave deductions correctly', () => {
    const input: PayrollInput = { ...base, unpaid_leave_days: 5 }
    const { deductions } = computePayroll(input)
    // daily = 50000/30 ≈ 1666.67, * 5 = 8333.33
    expect(deductions).toBeCloseTo(8333.33, 1)
  })

  it('reduces net salary for unpaid leave', () => {
    const { net: netNoLeave } = computePayroll(base)
    const { net: netWithLeave } = computePayroll({ ...base, unpaid_leave_days: 3 })
    expect(netWithLeave).toBeLessThan(netNoLeave)
  })

  it('handles zero salary', () => {
    const { gross, net, pf, tax, deductions } = computePayroll({
      ...base,
      basic_salary: 0,
      hra: 0,
      allowances: 0,
      bonus: 0,
    })
    expect(gross).toBe(0)
    expect(net).toBe(0)
    expect(pf).toBe(0)
    expect(tax).toBe(0)
    expect(deductions).toBe(0)
  })

  it('handles zero PF and tax percent', () => {
    const { pf, tax, net, gross } = computePayroll({
      ...base,
      pf_percent: 0,
      tax_percent: 0,
    })
    expect(pf).toBe(0)
    expect(tax).toBe(0)
    expect(net).toBe(gross) // no deductions, so net === gross
  })

  it('handles total_days = 0 (avoids division by zero)', () => {
    const { deductions } = computePayroll({ ...base, total_days: 0, unpaid_leave_days: 5 })
    expect(deductions).toBe(0)
  })

  it('handles 100% tax (extreme case)', () => {
    const { net } = computePayroll({ ...base, tax_percent: 100, pf_percent: 0 })
    // gross = 77000, tax = 77000, net = 77000 - 77000 = 0
    expect(net).toBe(0)
  })

  it('handles fractional leave days', () => {
    const input: PayrollInput = { ...base, unpaid_leave_days: 1 }
    const { deductions } = computePayroll(input)
    // daily = 50000/30 ≈ 1666.67
    expect(deductions).toBeCloseTo(1666.67, 1)
  })

  it('gross is sum of all positive components', () => {
    const { gross } = computePayroll({
      ...base,
      basic_salary: 10000,
      hra: 2000,
      allowances: 500,
      bonus: 100,
    })
    expect(gross).toBe(12600)
  })
})

describe('Employee Code Generation logic', () => {
  // Test the prefix building logic in isolation
  function buildPrefix(
    country?: string,
    state?: string,
    city?: string,
    branch?: string,
    deptName = 'XX',
  ): string {
    const c = country ? country.substring(0, 3).toUpperCase() : 'XXX'
    const s = state ? state.substring(0, 2).toUpperCase() : 'XX'
    const ct = city ? city.substring(0, 3).toUpperCase() : 'XXX'
    const br = branch ? branch.substring(0, 3).toUpperCase() : 'BR1'
    return `${c}-${s}-${ct}-${br}-${deptName}-`
  }

  it('builds correct prefix for a full input', () => {
    expect(buildPrefix('India', 'Karnataka', 'Bangalore', 'BR1', 'EN')).toBe(
      'IND-KA-BAN-BR1-EN-',
    )
  })

  it('uses XXX-XX-XXX-BR1 defaults when inputs are missing', () => {
    expect(buildPrefix()).toBe('XXX-XX-XXX-BR1-XX-')
  })

  it('truncates long country to 3 chars', () => {
    const prefix = buildPrefix('UnitedStatesOfAmerica', 'CA', 'LA', 'BR1', 'HR')
    expect(prefix.startsWith('UNI')).toBe(true)
  })

  it('truncates long state to 2 chars', () => {
    const prefix = buildPrefix('India', 'Karnataka', 'BLR', 'BR1', 'HR')
    // state portion = KA
    expect(prefix).toContain('-KA-')
  })

  it('uppercases country/state/city/branch parts (deptName is not uppercased in this helper)', () => {
    const prefix = buildPrefix('india', 'karnataka', 'bangalore', 'br1', 'hr')
    expect(prefix).toBe('IND-KA-BAN-BR1-hr-')
  })
})
