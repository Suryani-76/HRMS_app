import { useMemo, useState } from 'react'
import { Download, FileText, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { usePayroll } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatCurrency, monthName } from '@/lib/format'
import { downloadPayslipPdf } from '@/lib/payslip-pdf'
import { PayslipDocumentSheet } from '@/components/payroll/payslip-document-sheet'
import type { Payroll } from '@/lib/database.types'

export default function PayslipsPage() {
  const { employee } = useAuth()
  const { data: payroll = [], isLoading } = usePayroll()
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)

  const mine = useMemo(
    () => payroll.filter((p) => p.employee_id === employee?.id).sort((a, b) => b.pay_period.localeCompare(a.pay_period)),
    [payroll, employee?.id],
  )

  return (
    <div>
      <PageHeader title="My Payslips" description="Download and view your official monthly salary slips." />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : mine.length === 0 ? (
        <EmptyState title="No payslips yet" description="Your payslips will appear here once payroll is generated." icon={FileText} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((p) => {
            const gross = p.basic_salary + p.hra + p.allowances + p.bonus
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
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
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" variant="outline" size="sm" onClick={() => setSelectedPayroll(p)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <Button className="flex-1 bg-sky-600 hover:bg-sky-700 text-white" size="sm" onClick={() => downloadPayslipPdf(p)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PayslipDocumentSheet
        payroll={selectedPayroll}
        open={!!selectedPayroll}
        onOpenChange={(o) => !o && setSelectedPayroll(null)}
      />
    </div>
  )
}
