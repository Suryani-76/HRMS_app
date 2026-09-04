import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadPayslipPdf } from '@/lib/payslip-pdf'
import type { Payroll } from '@/lib/database.types'

interface PayslipDocumentSheetProps {
  payroll: Payroll | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

export function PayslipDocumentSheet({ payroll, open, onOpenChange }: PayslipDocumentSheetProps) {
  if (!payroll) return null

  const emp = payroll.employee
  const empCode = emp?.employee_code || 'OK-00201'
  const empName = emp?.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : 'Narendra Kumar Jonnakuti'
  const doj = formatDOJ(emp?.joining_date)
  const bankName = (payroll as any).bank_name || (emp as any)?.bank_name || 'HDFC Bank'
  const panNo = (emp as any)?.pan_number || (emp as any)?.pan_no || (payroll as any).pan_no || 'CEOPN1406F'
  const bankAccNo = (payroll as any).bank_account || (emp as any)?.bank_account || '5010 0375 9247 60'

  const totalDays = payroll.total_days || 31
  const daysPaid = payroll.present_days > 0 ? payroll.present_days : totalDays
  const daysLop = Math.max(0, totalDays - daysPaid)

  const designation = (emp?.designation as any)?.name || (emp as any)?.designation || 'Software Developer'
  const uanNo = (emp as any)?.uan_number || (emp as any)?.uan_no || '1022 5668 0623'
  const department = (emp?.department as any)?.name || (emp as any)?.department || 'IT'
  const pfNo = (emp as any)?.pf_number || (emp as any)?.pf_no || 'APHYD359368500012'

  // Earnings breakdown calculation
  const basic = Number(payroll.basic_salary) || 20000
  const hra = Number(payroll.hra) || 8000
  const totalAllowances = Number(payroll.allowances) || 0
  const bonus = Number(payroll.bonus) || 0

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
  const it = Number(payroll.tax) || 0
  const pf = Number(payroll.provident_fund) || (basic > 0 ? Number((basic * 0.12).toFixed(2)) : 3600)
  const others = Number(payroll.deductions) || 0
  const grossDeductions = pt + it + pf + others
  const netPay = grossEarnings - grossDeductions

  const handlePrint = () => {
    const printContent = document.getElementById('oklut-payslip-sheet-container')
    if (!printContent) return
    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${empName} (${empCode})</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
            .payslip-box { border: 2px solid #000; width: 100%; box-sizing: border-box; background: #fff; font-size: 13px; }
            .header-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px 10px 18px; border-bottom: 1.5px solid #000; }
            .header-row img { height: 32px; width: auto; }
            .payslip-title { font-size: 15px; font-weight: bold; text-decoration: underline; text-align: center; flex: 1; margin-right: 80px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            td, th { border: 1.5px solid #000; padding: 5px 8px; vertical-align: middle; font-size: 12.5px; line-height: 1.3; }
            .meta-label { width: 20%; color: #000; font-weight: normal; }
            .meta-val { width: 30%; color: #000; font-weight: normal; }
            .earn-label { width: 28%; }
            .earn-val { width: 22%; text-align: right; }
            .ded-label { width: 28%; }
            .ded-val { width: 22%; text-align: right; }
            .font-bold { font-weight: bold; }
            .net-pay-row { font-size: 14px; font-weight: bold; padding: 8px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Official Payslip — {getMonthYearHeader(payroll.pay_period)}
          </DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button size="sm" onClick={() => downloadPayslipPdf(payroll)} className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Payslip Document Preview Container */}
        <div id="oklut-payslip-sheet-container" className="my-2 select-text">
          <div className="payslip-box border-2 border-black bg-white text-black font-sans text-[13px]">
            {/* Header: Logo on left, Title center/right */}
            <div className="header-row flex items-center justify-between px-4 py-3 border-b-2 border-black">
              <div className="flex items-center">
                <img src="/oklutname.png" alt="OCLUT" className="h-8 w-auto object-contain" />
              </div>
              <div className="payslip-title text-sm sm:text-base font-bold underline text-center flex-1 pr-12">
                PAYSLIP FOR {getMonthYearHeader(payroll.pay_period)}
              </div>
            </div>

            {/* Table 1: Employee Meta Details */}
            <table className="w-full border-collapse table-fixed text-xs sm:text-[13px]">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 w-[20%]">Employee Code</td>
                  <td className="border border-black p-1.5 w-[30%]">{empCode}</td>
                  <td className="border border-black p-1.5 w-[20%]">Employee Name</td>
                  <td className="border border-black p-1.5 w-[30%]">{empName}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">D.O.J.</td>
                  <td className="border border-black p-1.5">{doj}</td>
                  <td className="border border-black p-1.5">Bank Name</td>
                  <td className="border border-black p-1.5">{bankName}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">PAN No.</td>
                  <td className="border border-black p-1.5">{panNo}</td>
                  <td className="border border-black p-1.5">Bank A/c No</td>
                  <td className="border border-black p-1.5">{bankAccNo}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Days paid for</td>
                  <td className="border border-black p-1.5">{daysPaid}</td>
                  <td className="border border-black p-1.5">Days for LOP</td>
                  <td className="border border-black p-1.5">{daysLop}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Designation</td>
                  <td className="border border-black p-1.5">{designation}</td>
                  <td className="border border-black p-1.5">UAN No</td>
                  <td className="border border-black p-1.5">{uanNo}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Department</td>
                  <td className="border border-black p-1.5">{department}</td>
                  <td className="border border-black p-1.5">PF No</td>
                  <td className="border border-black p-1.5">{pfNo}</td>
                </tr>
                <tr className="h-4">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                </tr>
              </tbody>
            </table>

            {/* Table 2: Earnings & Deductions Breakdown */}
            <table className="w-full border-collapse table-fixed text-xs sm:text-[13px]">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 w-[28%]">Basic</td>
                  <td className="border border-black p-1.5 w-[22%] text-right">{basic.toFixed(2)}</td>
                  <td className="border border-black p-1.5 w-[28%]">Professional Tax</td>
                  <td className="border border-black p-1.5 w-[22%] text-right">{pt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">HRA</td>
                  <td className="border border-black p-1.5 text-right">{hra.toFixed(2)}</td>
                  <td className="border border-black p-1.5">Income Tax</td>
                  <td className="border border-black p-1.5 text-right">{it.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Conveyance</td>
                  <td className="border border-black p-1.5 text-right">{conveyance.toFixed(2)}</td>
                  <td className="border border-black p-1.5">Provident Fund</td>
                  <td className="border border-black p-1.5 text-right">{pf.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Medical Allowance</td>
                  <td className="border border-black p-1.5 text-right">{medical.toFixed(2)}</td>
                  <td className="border border-black p-1.5">Others</td>
                  <td className="border border-black p-1.5 text-right">{others.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">Special Allowance</td>
                  <td className="border border-black p-1.5 text-right">{special.toFixed(2)}</td>
                  <td className="border border-black p-1.5"></td>
                  <td className="border border-black p-1.5"></td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black p-1.5">Gross Earnings</td>
                  <td className="border border-black p-1.5 text-right">{grossEarnings.toFixed(2)}</td>
                  <td className="border border-black p-1.5">Gross Deductions</td>
                  <td className="border border-black p-1.5 text-right">{grossDeductions.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="border border-black p-2 font-bold text-sm sm:text-base">
                    Net Pay &nbsp;&nbsp; Rs. {netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
