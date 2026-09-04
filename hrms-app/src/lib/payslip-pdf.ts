import { jsPDF } from 'jspdf'
import autoTablePlugin from 'jspdf-autotable'
import type { Payroll } from '@/lib/database.types'

const autoTable = typeof autoTablePlugin === 'function' ? autoTablePlugin : (autoTablePlugin as any).default

function formatDOJ(dateStr?: string | null): string {
  if (!dateStr) return '16-Jul-25'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(d.getDate()).padStart(2, '0')
    const mon = months[d.getMonth()]
    const yy = String(d.getFullYear()).slice(-2)
    return `${day}-${mon}-${yy}`
  } catch {
    return dateStr
  }
}

function getMonthYearHeader(payPeriod?: string): string {
  if (!payPeriod) return 'July-2026'
  const [y, m] = payPeriod.split('-')
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const mIndex = parseInt(m, 10) - 1
  const monthName = months[mIndex] || 'July'
  return `${monthName}-${y || '2026'}`
}

const OKLUT_LOGO_DATA_URL = 'data:image/png;base64,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'

export function generatePayslipPdfDoc(p: Payroll): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - (margin * 2)
  const startY = margin

  // 1. Header Box
  const headerHeight = 22

  // Draw official OCLUT logo image
  try {
    doc.addImage(OKLUT_LOGO_DATA_URL, 'PNG', margin + 3, startY + 4.5, 42, 11)
  } catch {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(0, 150, 214) // OCLUT Cyan / Sky Blue
    doc.text('OCLUT', margin + 3, startY + 14)
  }

  // Title: PAYSLIP FOR <Month-Year>
  const titleText = `PAYSLIP FOR ${getMonthYearHeader(p.pay_period)}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  const titleX = pageWidth / 2 + 10
  const titleY = startY + 15
  doc.text(titleText, titleX, titleY, { align: 'center' })

  // Underline
  const textWidth = doc.getTextWidth(titleText)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(titleX - (textWidth / 2), titleY + 1.2, titleX + (textWidth / 2), titleY + 1.2)

  // Divider line separating header from Table 1
  doc.line(margin, startY + headerHeight, margin + contentWidth, startY + headerHeight)

  // Extract Employee Meta
  const emp = p.employee
  const empCode = emp?.employee_code || 'OK-00201'
  const empName = emp?.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : 'Narendra Kumar Jonnakuti'
  const doj = formatDOJ(emp?.joining_date)
  const bankName = (p as any).bank_name || (emp as any)?.bank_name || 'HDFC Bank'
  const panNo = (emp as any)?.pan_number || (emp as any)?.pan_no || (p as any).pan_no || 'CEOPN1406F'
  const bankAccNo = (p as any).bank_account || (emp as any)?.bank_account || '5010 0375 9247 60'
  
  const totalDays = p.total_days || 31
  const daysPaid = p.present_days > 0 ? p.present_days : totalDays
  const daysLop = Math.max(0, totalDays - daysPaid)
  
  const designation = (emp?.designation as any)?.name || (emp as any)?.designation || 'Software Developer'
  const uanNo = (emp as any)?.uan_number || (emp as any)?.uan_no || '1022 5668 0623'
  const department = (emp?.department as any)?.name || (emp as any)?.department || 'IT'
  const pfNo = (emp as any)?.pf_number || (emp as any)?.pf_no || 'APHYD359368500012'

  const colWidthLabel = 34
  const colWidthVal = (contentWidth - (colWidthLabel * 2)) / 2

  // Table 1: Employee Details
  autoTable(doc, {
    startY: startY + headerHeight,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 },
      font: 'helvetica',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: colWidthLabel, fontStyle: 'normal' },
      1: { cellWidth: colWidthVal, fontStyle: 'normal' },
      2: { cellWidth: colWidthLabel, fontStyle: 'normal' },
      3: { cellWidth: colWidthVal, fontStyle: 'normal' },
    },
    body: [
      ['Employee Code', empCode, 'Employee Name', empName],
      ['D.O.J.', doj, 'Bank Name', bankName],
      ['PAN No.', panNo, 'Bank A/c No', bankAccNo],
      ['Days paid for', String(daysPaid), 'Days for LOP', String(daysLop)],
      ['Designation', designation, 'UAN No', uanNo],
      ['Department', department, 'PF No', pfNo],
      ['', '', '', ''],
    ],
  })

  const finalY1 = (doc as any).lastAutoTable?.finalY ?? (startY + headerHeight + 40)

  // Earnings breakdown calculation
  const basic = Number(p.basic_salary) || 20000
  const hra = Number(p.hra) || 8000
  const totalAllowances = Number(p.allowances) || 0
  const bonus = Number(p.bonus) || 0

  let conveyance = 2000
  let medical = 1250
  let special = 35750

  if (totalAllowances > 0 || bonus > 0) {
    if (totalAllowances >= 3250) {
      conveyance = 2000
      medical = 1250
      special = (totalAllowances - 3250) + bonus
    } else {
      conveyance = Number((totalAllowances * 0.5).toFixed(2))
      medical = Number((totalAllowances * 0.3).toFixed(2))
      special = Math.max(0, Number((totalAllowances - conveyance - medical + bonus).toFixed(2)))
    }
  }

  const grossEarnings = basic + hra + conveyance + medical + special

  // Deductions breakdown calculation
  const pt = 200
  const it = Number(p.tax) || 0
  const pf = Number(p.provident_fund) || (basic > 0 ? Number((basic * 0.12).toFixed(2)) : 3600)
  const others = Number(p.deductions) || 0
  const grossDeductions = pt + it + pf + others
  const netPay = grossEarnings - grossDeductions

  const colEarnLabel = 44
  const colEarnVal = (contentWidth / 2) - colEarnLabel
  const colDedLabel = 44
  const colDedVal = (contentWidth / 2) - colDedLabel

  // Table 2: Earnings & Deductions Grid
  autoTable(doc, {
    startY: finalY1,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 },
      font: 'helvetica',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: colEarnLabel, fontStyle: 'normal' },
      1: { cellWidth: colEarnVal, halign: 'right', fontStyle: 'normal' },
      2: { cellWidth: colDedLabel, fontStyle: 'normal' },
      3: { cellWidth: colDedVal, halign: 'right', fontStyle: 'normal' },
    },
    body: [
      ['Basic', basic.toFixed(2), 'Professional Tax', pt.toFixed(2)],
      ['HRA', hra.toFixed(2), 'Income Tax', it.toFixed(2)],
      ['Conveyance', conveyance.toFixed(2), 'Provident Fund', pf.toFixed(2)],
      ['Medical Allowance', medical.toFixed(2), 'Others', others.toFixed(2)],
      ['Special Allowance', special.toFixed(2), '', ''],
      [
        { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
        { content: grossEarnings.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: 'Gross Deductions', styles: { fontStyle: 'bold' } },
        { content: grossDeductions.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
      ],
      [
        {
          content: `Net Pay    Rs. ${netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          colSpan: 4,
          styles: { fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } }
        }
      ]
    ],
  })

  const finalY2 = (doc as any).lastAutoTable?.finalY ?? (finalY1 + 60)

  // Outer Box Border
  doc.setLineWidth(0.6)
  doc.setDrawColor(0, 0, 0)
  doc.rect(margin, startY, contentWidth, finalY2 - startY)

  return doc
}

export function downloadPayslipPdf(p: Payroll) {
  const doc = generatePayslipPdfDoc(p)
  const code = p.employee?.employee_code || 'employee'
  const period = p.pay_period || 'payslip'
  doc.save(`Payslip_${code}_${period}.pdf`)
}
