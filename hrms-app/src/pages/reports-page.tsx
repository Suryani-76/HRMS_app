import { useState } from 'react'
import { FileSpreadsheet, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import {
  useEmployees,
  useDepartments,
  useAttendanceLog,
  useLeaveRequests,
  usePayroll,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, formatCurrency, formatHours, currentPayPeriod, monthName } from '@/lib/format'
import { exportExcel, exportPdf, downloadCsv, type ExportColumn } from '@/lib/export'

function ExportButtons({ columns, rows, filename, title, subtitle }: { columns: ExportColumn[]; rows: Record<string, unknown>[]; filename: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => exportExcel(filename, columns, rows)} disabled={rows.length === 0}>
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportPdf(title, subtitle, columns, rows, filename)} disabled={rows.length === 0}>
        <FileText className="mr-2 h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadCsv(filename, columns, rows)} disabled={rows.length === 0}>
        <Download className="mr-2 h-4 w-4" /> CSV
      </Button>
    </div>
  )
}

function EmployeesReport() {
  const { data: employees = [], isLoading } = useEmployees()
  const { data: departments = [] } = useDepartments()

  const rows = employees.map((e) => ({
    code: e.employee_code ?? '',
    name: `${e.first_name} ${e.last_name}`,
    email: e.email,
    department: e.department?.name ?? '',
    designation: e.designation?.name ?? '',
    type: e.employment_type ?? '',
    joined: e.joining_date,
    status: e.status ?? 'Active',
  }))

  const columns: ExportColumn[] = [
    { header: 'Code', accessor: (r) => r.code as string },
    { header: 'Name', accessor: (r) => r.name as string },
    { header: 'Email', accessor: (r) => r.email as string },
    { header: 'Department', accessor: (r) => r.department as string },
    { header: 'Designation', accessor: (r) => r.designation as string },
    { header: 'Employment Type', accessor: (r) => r.type as string },
    { header: 'Joined', accessor: (r) => formatDate(r.joined as string) },
    { header: 'Status', accessor: (r) => r.status as string },
  ]

  return (
    <div>
      <ExportButtons
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        filename="employee-directory"
        title="Employee Directory"
        subtitle={`Oklut Technologies · ${employees.length} employees · ${departments.length} departments`}
      />
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.header} className="px-4 py-3">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">{e.employee_code}</td>
                    <td className="px-4 py-2.5 font-medium">{e.first_name} {e.last_name}</td>
                    <td className="px-4 py-2.5">{e.email}</td>
                    <td className="px-4 py-2.5">{e.department?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">{e.designation?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">{e.employment_type}</td>
                    <td className="px-4 py-2.5">{formatDate(e.joining_date)}</td>
                    <td className="px-4 py-2.5"><StatusPill status={e.status ?? 'Active'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AttendanceReport() {
  const [month, setMonth] = useState(currentPayPeriod())
  const { data: log = [], isLoading } = useAttendanceLog({ month })

  const rows = log.map((a) => ({
    name: `${a.employee?.first_name ?? ''} ${a.employee?.last_name ?? ''}`,
    code: a.employee?.employee_code ?? '',
    date: a.date,
    checkIn: a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    checkOut: a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    hours: a.working_hours ?? 0,
    status: a.status ?? 'absent',
  }))

  const columns: ExportColumn[] = [
    { header: 'Name', accessor: (r) => r.name as string },
    { header: 'Code', accessor: (r) => r.code as string },
    { header: 'Date', accessor: (r) => formatDate(r.date as string) },
    { header: 'Check In', accessor: (r) => r.checkIn as string },
    { header: 'Check Out', accessor: (r) => r.checkOut as string },
    { header: 'Hours', accessor: (r) => formatHours(r.hours as number) },
    { header: 'Status', accessor: (r) => r.status as string },
  ]

  return (
    <div>
      <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mb-4 sm:w-44" />
      <ExportButtons
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        filename={`attendance-report-${month}`}
        title="Attendance Report"
        subtitle={`Oklut Technologies · ${monthName(month)}`}
      />
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.header} className="px-4 py-3">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{a.employee?.first_name} {a.employee?.last_name}</td>
                    <td className="px-4 py-2.5">{a.employee?.employee_code}</td>
                    <td className="px-4 py-2.5">{formatDate(a.date)}</td>
                    <td className="px-4 py-2.5">{a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-2.5">{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-2.5">{formatHours(a.working_hours)}</td>
                    <td className="px-4 py-2.5"><StatusPill status={a.status ?? 'absent'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LeaveReport() {
  const { data: requests = [], isLoading } = useLeaveRequests()

  const rows = requests.map((r) => ({
    name: `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`,
    code: r.employee?.employee_code ?? '',
    type: r.leave_type?.name ?? '',
    start: r.start_date,
    end: r.end_date,
    days: r.days,
    status: r.status ?? 'pending',
  }))

  const columns: ExportColumn[] = [
    { header: 'Name', accessor: (r) => r.name as string },
    { header: 'Code', accessor: (r) => r.code as string },
    { header: 'Leave Type', accessor: (r) => r.type as string },
    { header: 'Start', accessor: (r) => formatDate(r.start as string) },
    { header: 'End', accessor: (r) => formatDate(r.end as string) },
    { header: 'Days', accessor: (r) => r.days as number },
    { header: 'Status', accessor: (r) => r.status as string },
  ]

  return (
    <div>
      <ExportButtons
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        filename="leave-report"
        title="Leave Report"
        subtitle={`Oklut Technologies · ${requests.length} leave requests`}
      />
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.header} className="px-4 py-3">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.employee?.first_name} {r.employee?.last_name}</td>
                    <td className="px-4 py-2.5">{r.employee?.employee_code}</td>
                    <td className="px-4 py-2.5">{r.leave_type?.name}</td>
                    <td className="px-4 py-2.5">{formatDate(r.start_date)}</td>
                    <td className="px-4 py-2.5">{formatDate(r.end_date)}</td>
                    <td className="px-4 py-2.5">{r.days}</td>
                    <td className="px-4 py-2.5"><StatusPill status={r.status ?? 'pending'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PayrollReport() {
  const [period, setPeriod] = useState(currentPayPeriod())
  const { data: payroll = [], isLoading } = usePayroll(period)

  const rows = payroll.map((p) => ({
    name: `${p.employee?.first_name ?? ''} ${p.employee?.last_name ?? ''}`,
    code: p.employee?.employee_code ?? '',
    basic: p.basic_salary,
    hra: p.hra,
    allowances: p.allowances,
    bonus: p.bonus,
    deductions: p.deductions + p.tax + p.provident_fund,
    net: p.net_salary,
    status: p.status ?? 'draft',
  }))

  const columns: ExportColumn[] = [
    { header: 'Name', accessor: (r) => r.name as string },
    { header: 'Code', accessor: (r) => r.code as string },
    { header: 'Basic', accessor: (r) => formatCurrency(r.basic as number) },
    { header: 'HRA', accessor: (r) => formatCurrency(r.hra as number) },
    { header: 'Allowances', accessor: (r) => formatCurrency(r.allowances as number) },
    { header: 'Bonus', accessor: (r) => formatCurrency(r.bonus as number) },
    { header: 'Deductions', accessor: (r) => formatCurrency(r.deductions as number) },
    { header: 'Net Salary', accessor: (r) => formatCurrency(r.net as number) },
    { header: 'Status', accessor: (r) => r.status as string },
  ]

  return (
    <div>
      <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mb-4 sm:w-44" />
      <ExportButtons
        columns={columns}
        rows={rows as unknown as Record<string, unknown>[]}
        filename={`payroll-report-${period}`}
        title="Payroll Report"
        subtitle={`Oklut Technologies · ${monthName(period)}`}
      />
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.header} className="px-4 py-3">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{p.employee?.first_name} {p.employee?.last_name}</td>
                    <td className="px-4 py-2.5">{p.employee?.employee_code}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.hra)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.allowances)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.bonus)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.deductions + p.tax + p.provident_fund)}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatCurrency(p.net_salary)}</td>
                    <td className="px-4 py-2.5"><StatusPill status={p.status ?? 'draft'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { isManager } = useAuth()
  if (!isManager) return <PageHeader title="Reports" description="Only managers can access reports." />
  return (
    <div>
      <PageHeader title="Reports" description="Generate and export organization reports." />
      <Tabs defaultValue="employees">
        <TabsList className="flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4"><Card><CardContent className="p-5"><EmployeesReport /></CardContent></Card></TabsContent>
        <TabsContent value="attendance" className="mt-4"><Card><CardContent className="p-5"><AttendanceReport /></CardContent></Card></TabsContent>
        <TabsContent value="leave" className="mt-4"><Card><CardContent className="p-5"><LeaveReport /></CardContent></Card></TabsContent>
        <TabsContent value="payroll" className="mt-4"><Card><CardContent className="p-5"><PayrollReport /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
