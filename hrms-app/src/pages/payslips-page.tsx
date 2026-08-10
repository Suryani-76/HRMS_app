import { useMemo } from 'react'
import { Download, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { usePayroll } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatCurrency, formatDate, monthName } from '@/lib/format'
import type { Payroll } from '@/lib/database.types'

function downloadPayslip(p: Payroll) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Oklut Technologies', 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Employee Pay Slip', 14, 27)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 34,
    head: [['Field', 'Value']],
    body: [
      ['Pay Period', monthName(p.pay_period)],
      ['Employee', `${p.employee?.first_name ?? ''} ${p.employee?.last_name ?? ''} (${p.employee?.employee_code ?? ''})`],
      ['Basic Salary', formatCurrency(p.basic_salary)],
      ['HRA', formatCurrency(p.hra)],
      ['Allowances', formatCurrency(p.allowances)],
      ['Bonus', formatCurrency(p.bonus)],
      ['Gross Pay', formatCurrency(p.basic_salary + p.hra + p.allowances + p.bonus)],
      ['Leave Deduction', formatCurrency(p.deductions)],
      ['Provident Fund', formatCurrency(p.provident_fund)],
      ['Tax', formatCurrency(p.tax)],
      ['Present Days', `${p.present_days} / ${p.total_days}`],
      ['Net Pay', formatCurrency(p.net_salary)],
    ],
    styles: { fontSize: 10 },
  })

  doc.setFontSize(9)
  doc.setTextColor(100)
  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 120
  doc.text(`Generated on ${formatDate(new Date().toISOString())} · Status: ${p.status ?? 'draft'}`, 14, finalY + 8)
  doc.save(`payslip-${p.employee?.employee_code ?? 'employee'}-${p.pay_period}.pdf`)
}

export default function PayslipsPage() {
  const { employee } = useAuth()
  const { data: payroll = [], isLoading } = usePayroll()

  const mine = useMemo(
    () => payroll.filter((p) => p.employee_id === employee?.id).sort((a, b) => b.pay_period.localeCompare(a.pay_period)),
    [payroll, employee?.id],
  )

  return (
    <div>
      <PageHeader title="My Payslips" description="Download your monthly salary slips." />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : mine.length === 0 ? (
        <EmptyState title="No payslips yet" description="Your payslips will appear here once payroll is generated." icon={FileText} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((p) => {
            const gross = p.basic_salary + p.hra + p.allowances + p.bonus
            return (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{monthName(p.pay_period)}</p>
                      <p className="text-xs text-muted-foreground">Pay period</p>
                    </div>
                    <Badge variant={p.status === 'paid' ? 'success' : 'secondary'}>{p.status ?? 'draft'}</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span>{formatCurrency(gross)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="text-destructive">{formatCurrency(p.deductions + p.tax + p.provident_fund)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-semibold"><span>Net pay</span><span className="text-success">{formatCurrency(p.net_salary)}</span></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Days</span><span>{p.present_days}/{p.total_days}</span></div>
                  </div>
                  <Button className="mt-4 w-full" variant="outline" onClick={() => downloadPayslip(p)}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
