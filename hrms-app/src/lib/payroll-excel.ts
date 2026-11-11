import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import type { Employee, PayrollProfile } from '@/lib/database.types'

export interface ParsedPayrollRow {
  employeeId: string
  employeeCode: string
  employeeName: string
  departmentName?: string
  payPeriod: string
  basicSalary: number
  hra: number
  allowances: number
  bonus: number
  deductions: number
  tax: number
  providentFund: number
  presentDays: number
  totalDays: number
  netSalary: number
  status: 'draft' | 'generated' | 'paid'
  bankName?: string
  bankAccount?: string
  ifscCode?: string
}

export interface UnmatchedPayrollRow {
  rowNumber: number
  rawIdentifier: string
  rawName?: string
  rawAmount?: number
  reason: string
}

export interface ExcelPayrollParseResult {
  period: string
  matchedRows: ParsedPayrollRow[]
  unmatchedRows: UnmatchedPayrollRow[]
  totalGross: number
  totalDeductions: number
  totalNet: number
}

// ----------------------------------------------------------------------------
// 1. Download Pre-Filled Excel Template
// ----------------------------------------------------------------------------
export function downloadPayrollTemplate(
  employees: Employee[],
  profiles: PayrollProfile[] = [],
  period: string
) {
  const profileMap = new Map<string, PayrollProfile>()
  profiles.forEach((p) => profileMap.set(p.employee_id, p))

  const [y, m] = period.split('-').map(Number)
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30

  const data = employees.map((emp) => {
    const prof = profileMap.get(emp.id)
    const basic = Number(prof?.basic_salary ?? emp.basic_salary ?? 0)
    const hra = Number(prof?.hra ?? emp.hra ?? 0)
    const allowances = Number(prof?.allowances ?? emp.allowances ?? 0)
    const bonus = Number(prof?.bonus ?? emp.bonus ?? 0)
    const pf = Number((((basic + hra) * (prof?.pf_percent ?? 12)) / 100).toFixed(2))
    const tax = Number((((basic + hra + allowances + bonus) * (prof?.tax_percent ?? 5)) / 100).toFixed(2))
    const gross = basic + hra + allowances + bonus
    const deductions = 0
    const net = Number((gross - deductions - pf - tax).toFixed(2))

    return {
      'Employee Code': emp.employee_code || '',
      'Employee Name': `${emp.first_name} ${emp.last_name}`.trim(),
      'Email': emp.email || '',
      'Department': emp.department?.name || '',
      'Designation': emp.designation?.name || '',
      'Pay Period': period,
      'Basic Salary': basic,
      'HRA': hra,
      'Allowances': allowances,
      'Bonus': bonus,
      'Deductions': deductions,
      'Provident Fund (PF)': pf,
      'Tax (TDS)': tax,
      'Present Days': daysInMonth,
      'Total Days': daysInMonth,
      'Net Salary': net > 0 ? net : (gross > 0 ? gross : 0),
      'Status': 'generated',
      'Bank Name': prof?.bank_name || emp.bank_name || '',
      'Bank Account': prof?.bank_account || emp.bank_account_number || '',
      'IFSC Code': prof?.ifsc_code || emp.ifsc_code || '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(data)

  // Configure column widths
  ws['!cols'] = [
    { wch: 18 }, // Employee Code
    { wch: 24 }, // Name
    { wch: 28 }, // Email
    { wch: 16 }, // Department
    { wch: 20 }, // Designation
    { wch: 12 }, // Pay Period
    { wch: 14 }, // Basic
    { wch: 12 }, // HRA
    { wch: 14 }, // Allowances
    { wch: 12 }, // Bonus
    { wch: 14 }, // Deductions
    { wch: 18 }, // PF
    { wch: 14 }, // Tax
    { wch: 14 }, // Present Days
    { wch: 12 }, // Total Days
    { wch: 16 }, // Net Salary
    { wch: 12 }, // Status
    { wch: 18 }, // Bank Name
    { wch: 20 }, // Bank Account
    { wch: 14 }, // IFSC
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Payroll ${period}`)
  XLSX.writeFile(wb, `Payroll_Template_${period}.xlsx`)
}

// ----------------------------------------------------------------------------
// 2. Parse Uploaded Excel Sheet
// ----------------------------------------------------------------------------
function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback
  if (typeof val === 'number') return isNaN(val) ? fallback : val
  const cleaned = String(val).replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? fallback : num
}

export async function parsePayrollExcel(
  file: File,
  employees: Employee[],
  defaultPeriod: string
): Promise<ExcelPayrollParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'array' })

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file does not contain any sheets.')
  }

  // Find sheet: prefer one with "payroll" or "salary", else first sheet
  const sheetName =
    wb.SheetNames.find((s) => s.toLowerCase().includes('payroll') || s.toLowerCase().includes('salary')) ||
    wb.SheetNames[0]

  const sheet = wb.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

  if (rawRows.length === 0) {
    throw new Error('The uploaded Excel sheet contains no data rows.')
  }

  // Create fast lookup maps for employees
  const byCode = new Map<string, Employee>()
  const byEmail = new Map<string, Employee>()
  const byFullName = new Map<string, Employee>()

  employees.forEach((emp) => {
    if (emp.employee_code) {
      byCode.set(emp.employee_code.trim().toLowerCase(), emp)
      // also allow matching raw numeric sequence like "190" in OKL-GEN-2026-190
      const parts = emp.employee_code.split('-')
      if (parts.length > 0) {
        byCode.set(parts[parts.length - 1].trim().toLowerCase(), emp)
      }
    }
    if (emp.email) {
      byEmail.set(emp.email.trim().toLowerCase(), emp)
    }
    const full = `${emp.first_name} ${emp.last_name}`.trim().toLowerCase()
    byFullName.set(full, emp)
  })

  const matchedRows: ParsedPayrollRow[] = []
  const unmatchedRows: UnmatchedPayrollRow[] = []
  let detectedPeriod = defaultPeriod

  const [defY, defM] = defaultPeriod.split('-').map(Number)
  const defaultDaysInMonth = defY && defM ? new Date(defY, defM, 0).getDate() : 30

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-based + 1 header row

    // Map normalized keys to row values
    const normMap: Record<string, any> = {}
    Object.keys(row).forEach((k) => {
      normMap[normalizeKey(k)] = row[k]
    })

    // Look for identifier
    const rawCode = String(
      normMap['employeecode'] ||
      normMap['empcode'] ||
      normMap['employeeid'] ||
      normMap['empid'] ||
      normMap['code'] ||
      normMap['id'] ||
      ''
    ).trim()

    const rawEmail = String(
      normMap['email'] ||
      normMap['employeeemail'] ||
      normMap['mail'] ||
      normMap['workemail'] ||
      ''
    ).trim()

    const rawName = String(
      normMap['employeename'] ||
      normMap['name'] ||
      normMap['fullname'] ||
      normMap['employee'] ||
      ''
    ).trim()

    // Find matched employee
    let matchedEmp: Employee | undefined
    if (rawCode) {
      matchedEmp = byCode.get(rawCode.toLowerCase())
    }
    if (!matchedEmp && rawEmail) {
      matchedEmp = byEmail.get(rawEmail.toLowerCase())
    }
    if (!matchedEmp && rawName) {
      matchedEmp = byFullName.get(rawName.toLowerCase())
      if (!matchedEmp) {
        // try partial matching if name matches first and last
        const qName = rawName.toLowerCase()
        matchedEmp = employees.find((e) => {
          const fn = `${e.first_name} ${e.last_name}`.toLowerCase()
          return fn.includes(qName) || qName.includes(fn)
        })
      }
    }

    if (!matchedEmp) {
      // Check if row is purely blank
      const hasAnyValue = Object.values(normMap).some((v) => v !== '' && v !== null && v !== undefined)
      if (hasAnyValue) {
        unmatchedRows.push({
          rowNumber: rowNum,
          rawIdentifier: rawCode || rawEmail || rawName || `Row ${rowNum}`,
          rawName: rawName || undefined,
          rawAmount: parseNumber(normMap['netsalary'] || normMap['net'] || normMap['basicsalary'] || normMap['basic']),
          reason: 'Employee code, email, or name could not be matched to an active employee.',
        })
      }
      return
    }

    // Determine row pay period
    let rowPeriod = String(
      normMap['payperiod'] ||
      normMap['period'] ||
      normMap['month'] ||
      detectedPeriod
    ).trim()

    // If Excel has format like '2026-11' or 'Nov 2026' or Date serial
    if (rowPeriod && rowPeriod.length === 7 && rowPeriod.includes('-')) {
      detectedPeriod = rowPeriod
    } else {
      rowPeriod = detectedPeriod
    }

    const [rowY, rowM] = rowPeriod.split('-').map(Number)
    const daysInMonth = rowY && rowM ? new Date(rowY, rowM, 0).getDate() : defaultDaysInMonth

    // Parse Salary Components
    let basic = parseNumber(
      normMap['basicsalary'] ||
      normMap['basic'] ||
      normMap['basicpay'] ||
      normMap['base'] ||
      normMap['basesalary'],
      0
    )
    let hra = parseNumber(
      normMap['hra'] ||
      normMap['houserent'] ||
      normMap['houserentallowance'],
      0
    )
    let allowances = parseNumber(
      normMap['allowances'] ||
      normMap['allowance'] ||
      normMap['specialallowance'] ||
      normMap['otherallowances'] ||
      normMap['da'],
      0
    )
    let bonus = parseNumber(
      normMap['bonus'] ||
      normMap['incentive'] ||
      normMap['variablepay'] ||
      normMap['performancebonus'],
      0
    )

    const rawGross = parseNumber(
      normMap['grosssalary'] ||
      normMap['gross'] ||
      normMap['grosspay'],
      0
    )

    // Deductions & Days
    const deductions = parseNumber(
      normMap['deductions'] ||
      normMap['deduction'] ||
      normMap['otherdeductions'] ||
      normMap['lop'],
      0
    )

    let pf = parseNumber(
      normMap['providentfundpf'] ||
      normMap['providentfund'] ||
      normMap['pf'] ||
      normMap['pfamount'],
      0
    )

    let tax = parseNumber(
      normMap['taxtds'] ||
      normMap['tax'] ||
      normMap['tds'] ||
      normMap['incometax'],
      0
    )

    const totalDays = parseNumber(
      normMap['totaldays'] ||
      normMap['monthdays'] ||
      normMap['calendardays'],
      daysInMonth
    )

    const presentDays = parseNumber(
      normMap['presentdays'] ||
      normMap['workingdays'] ||
      normMap['daysworked'] ||
      normMap['present'],
      totalDays
    )

    // Calculate or infer
    if (basic === 0 && rawGross > 0) {
      // If only gross is provided, split basic 50%, HRA 30%, allowances 20%
      basic = Math.round(rawGross * 0.5)
      hra = Math.round(rawGross * 0.3)
      allowances = Math.round(rawGross * 0.2)
    }

    if (pf === 0 && basic > 0) {
      pf = Number((((basic + hra) * 12) / 100).toFixed(2))
    }
    if (tax === 0 && basic > 0) {
      tax = Number((((basic + hra + allowances + bonus) * 5) / 100).toFixed(2))
    }

    const calculatedGross = basic + hra + allowances + bonus
    let net = parseNumber(
      normMap['netsalary'] ||
      normMap['net'] ||
      normMap['netpay'] ||
      normMap['netpayable'] ||
      normMap['takehome'],
      0
    )

    if (net === 0) {
      net = Number((calculatedGross - deductions - pf - tax).toFixed(2))
      if (net < 0) net = 0
    }

    const rawStatus = String(normMap['status'] || 'generated').toLowerCase()
    const status: 'draft' | 'generated' | 'paid' =
      rawStatus === 'paid' ? 'paid' : rawStatus === 'draft' ? 'draft' : 'generated'

    const bankName = String(normMap['bankname'] || normMap['bank'] || '').trim() || undefined
    const bankAccount = String(normMap['bankaccount'] || normMap['accountnumber'] || normMap['accountno'] || '').trim() || undefined
    const ifscCode = String(normMap['ifsccode'] || normMap['ifsc'] || '').trim() || undefined

    matchedRows.push({
      employeeId: matchedEmp.id,
      employeeCode: matchedEmp.employee_code || rawCode,
      employeeName: `${matchedEmp.first_name} ${matchedEmp.last_name}`,
      departmentName: matchedEmp.department?.name,
      payPeriod: rowPeriod,
      basicSalary: basic,
      hra,
      allowances,
      bonus,
      deductions,
      tax,
      providentFund: pf,
      presentDays,
      totalDays,
      netSalary: net,
      status,
      bankName,
      bankAccount,
      ifscCode,
    })
  })

  const totalGross = matchedRows.reduce((s, r) => s + r.basicSalary + r.hra + r.allowances + r.bonus, 0)
  const totalDeductions = matchedRows.reduce((s, r) => s + r.deductions + r.tax + r.providentFund, 0)
  const totalNet = matchedRows.reduce((s, r) => s + r.netSalary, 0)

  return {
    period: detectedPeriod,
    matchedRows,
    unmatchedRows,
    totalGross,
    totalDeductions,
    totalNet,
  }
}

// ----------------------------------------------------------------------------
// 3. Commit Generated Payroll to Supabase
// ----------------------------------------------------------------------------
export async function commitExcelPayroll(parsedRows: ParsedPayrollRow[]) {
  if (parsedRows.length === 0) return { count: 0 }

  const payrollPayloads = parsedRows.map((r) => ({
    employee_id: r.employeeId,
    pay_period: r.payPeriod,
    basic_salary: r.basicSalary,
    hra: r.hra,
    allowances: r.allowances,
    bonus: r.bonus,
    deductions: r.deductions,
    tax: r.tax,
    provident_fund: r.providentFund,
    present_days: r.presentDays,
    total_days: r.totalDays,
    net_salary: r.netSalary,
    status: r.status,
    generated_at: new Date().toISOString(),
    ...(r.status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
  }))

  // 1. Upsert into payroll table
  const { data, error } = await supabase
    .from('payroll')
    .upsert(payrollPayloads, { onConflict: 'employee_id,pay_period' })
    .select('id')

  if (error) {
    throw new Error(`Failed to save payroll records: ${error.message}`)
  }

  // 2. Best-effort sync to payroll_profiles so profiles are updated with these numbers
  for (const r of parsedRows) {
    try {
      const profilePayload: any = {
        employee_id: r.employeeId,
        basic_salary: r.basicSalary,
        hra: r.hra,
        allowances: r.allowances,
        bonus: r.bonus,
        updated_at: new Date().toISOString(),
      }
      if (r.bankName) profilePayload.bank_name = r.bankName
      if (r.bankAccount) profilePayload.bank_account = r.bankAccount
      if (r.ifscCode) profilePayload.ifsc_code = r.ifscCode

      await supabase
        .from('payroll_profiles')
        .upsert(profilePayload, { onConflict: 'employee_id' })
    } catch {
      // ignore individual profile sync errors
    }
  }

  return { count: data?.length || payrollPayloads.length }
}

